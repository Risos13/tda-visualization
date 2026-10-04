"""
FastAPI TDA Microservice
Advanced Topological Data Analysis computation service
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from datetime import datetime
import asyncio
import logging
import os
import shutil
from pathlib import Path
from sqlalchemy import text

# TDA Libraries
import gudhi
from ripser import ripser
from persim import plot_diagrams
import matplotlib.pyplot as plt
import io
import base64

# Database
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import UUID
import uuid

# Configuration
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    database_url: str = "postgresql://xkfi_user:xkfi_password@postgres:5432/xkfi_tda"
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5000"]
    upload_dir: str = os.getenv("UPLOAD_DIR", "/app/uploads")
    
    class Config:
        env_file = ".env"

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)

# Database setup
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class TDAComputation(Base):
    __tablename__ = "tda_computations_advanced"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    algorithm = Column(String, nullable=False)
    parameters = Column(JSON)
    input_data_hash = Column(String)
    persistence_diagram = Column(JSON)
    barcodes = Column(JSON)
    computation_time_ms = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(
    title="TDA Microservice",
    description="Advanced Topological Data Analysis computation service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class DataPoint(BaseModel):
    x: float
    y: float
    z: Optional[float] = None

class TDARequest(BaseModel):
    data: List[DataPoint]
    algorithm: str = Field(default="gudhi", description="TDA algorithm: gudhi, ripser, or simple")
    max_dimension: int = Field(default=2, ge=0, le=3)
    max_edge_length: Optional[float] = None
    parameters: Optional[Dict[str, Any]] = {}

class PersistencePair(BaseModel):
    dimension: int
    birth: float
    death: float

class TDAResponse(BaseModel):
    computation_id: str
    algorithm: str
    persistence_diagram: List[PersistencePair]
    barcodes: Dict[str, List[Dict[str, float]]]
    computation_time_ms: float
    metadata: Dict[str, Any]

class StreamingTDARequest(BaseModel):
    sensor_data: List[Dict[str, float]]
    window_size: int = Field(default=50, ge=10, le=200)
    algorithm: str = Field(default="gudhi")
    max_dimension: int = Field(default=1, ge=0, le=2)

# TDA computation functions
class TDAComputer:
    @staticmethod
    def prepare_data(data_points: List[DataPoint]) -> np.ndarray:
        """Convert data points to numpy array"""
        if not data_points:
            raise ValueError("No data points provided")
        
        # Determine dimensionality
        has_z = any(point.z is not None for point in data_points)
        
        if has_z:
            return np.array([[p.x, p.y, p.z or 0] for p in data_points])
        else:
            return np.array([[p.x, p.y] for p in data_points])
    
    @staticmethod
    def compute_gudhi(data: np.ndarray, max_dimension: int = 2, max_edge_length: Optional[float] = None) -> Dict:
        """Compute persistent homology using GUDHI"""
        start_time = datetime.now()
        
        # Create Rips complex
        rips_complex = gudhi.RipsComplex(points=data, max_edge_length=max_edge_length or float('inf'))
        simplex_tree = rips_complex.create_simplex_tree(max_dimension=max_dimension)
        
        # Compute persistence
        persistence = simplex_tree.persistence()
        
        # Format results
        persistence_diagram = []
        barcodes = {str(i): [] for i in range(max_dimension + 1)}
        
        for dim, (birth, death) in persistence:
            if death == float('inf'):
                death = max(data.max(), birth + 1)  # Handle infinite bars
            
            persistence_diagram.append({
                "dimension": dim,
                "birth": float(birth),
                "death": float(death)
            })
            
            barcodes[str(dim)].append({
                "birth": float(birth),
                "death": float(death),
                "lifetime": float(death - birth)
            })
        
        computation_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "persistence_diagram": persistence_diagram,
            "barcodes": barcodes,
            "computation_time_ms": computation_time,
            "metadata": {
                "num_points": len(data),
                "max_dimension": max_dimension,
                "num_simplices": simplex_tree.num_simplices()
            }
        }
    
    @staticmethod
    def compute_ripser(data: np.ndarray, max_dimension: int = 2, max_edge_length: Optional[float] = None) -> Dict:
        """Compute persistent homology using Ripser"""
        start_time = datetime.now()
        
        # Compute with Ripser
        diagrams = ripser(data, maxdim=max_dimension, thresh=max_edge_length or np.inf)
        
        # Format results
        persistence_diagram = []
        barcodes = {str(i): [] for i in range(max_dimension + 1)}
        
        for dim, diagram in enumerate(diagrams['dgms']):
            for birth, death in diagram:
                if death == np.inf:
                    death = max(data.max(), birth + 1)
                
                persistence_diagram.append({
                    "dimension": dim,
                    "birth": float(birth),
                    "death": float(death)
                })
                
                barcodes[str(dim)].append({
                    "birth": float(birth),
                    "death": float(death),
                    "lifetime": float(death - birth)
                })
        
        computation_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "persistence_diagram": persistence_diagram,
            "barcodes": barcodes,
            "computation_time_ms": computation_time,
            "metadata": {
                "num_points": len(data),
                "max_dimension": max_dimension
            }
        }
    
    @staticmethod
    def compute_streaming_tda(sensor_data: List[Dict[str, float]], window_size: int, algorithm: str) -> Dict:
        """Compute TDA on streaming sensor data using sliding window"""
        if len(sensor_data) < window_size:
            raise ValueError(f"Not enough data points. Need at least {window_size}, got {len(sensor_data)}")
        
        # Take the most recent window
        recent_data = sensor_data[-window_size:]
        
        # Extract relevant features for TDA (speed, acceleration as 2D points)
        points = []
        for reading in recent_data:
            x = reading.get('speed', 0)
            y = reading.get('acceleration', 0)
            points.append(DataPoint(x=x, y=y))
        
        # Compute TDA
        data_array = TDAComputer.prepare_data(points)
        
        if algorithm == "ripser":
            return TDAComputer.compute_ripser(data_array, max_dimension=1)
        else:
            return TDAComputer.compute_gudhi(data_array, max_dimension=1)

# API Routes
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with database connectivity test"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected", "service": "tda-microservice", "timestamp": datetime.utcnow()}
    except Exception as e:
        # Log the error and return detailed message
        logging.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e)}
        )

@app.post("/compute-tda", response_model=TDAResponse)
async def compute_tda(request: TDARequest, db: Session = Depends(get_db)):
    """Compute TDA on provided dataset"""
    try:
        # Prepare data
        data_array = TDAComputer.prepare_data(request.data)
        
        # Compute based on algorithm
        if request.algorithm == "ripser":
            result = TDAComputer.compute_ripser(
                data_array, 
                request.max_dimension, 
                request.max_edge_length
            )
        elif request.algorithm == "gudhi":
            result = TDAComputer.compute_gudhi(
                data_array, 
                request.max_dimension, 
                request.max_edge_length
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown algorithm: {request.algorithm}")
        
        # Store in database
        computation_id = str(uuid.uuid4())
        db_computation = TDAComputation(
            id=computation_id,
            algorithm=request.algorithm,
            parameters=request.parameters,
            input_data_hash=str(hash(str(data_array.tolist()))),
            persistence_diagram=result["persistence_diagram"],
            barcodes=result["barcodes"],
            computation_time_ms=result["computation_time_ms"]
        )
        db.add(db_computation)
        db.commit()
        
        # Format response
        persistence_pairs = [
            PersistencePair(**pair) for pair in result["persistence_diagram"]
        ]
        
        return TDAResponse(
            computation_id=computation_id,
            algorithm=request.algorithm,
            persistence_diagram=persistence_pairs,
            barcodes=result["barcodes"],
            computation_time_ms=result["computation_time_ms"],
            metadata=result["metadata"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compute-streaming-tda")
async def compute_streaming_tda(request: StreamingTDARequest, db: Session = Depends(get_db)):
    """Compute TDA on streaming sensor data"""
    try:
        result = TDAComputer.compute_streaming_tda(
            request.sensor_data,
            request.window_size,
            request.algorithm
        )
        
        # Store computation
        computation_id = str(uuid.uuid4())
        db_computation = TDAComputation(
            id=computation_id,
            algorithm=f"streaming_{request.algorithm}",
            parameters={"window_size": request.window_size},
            persistence_diagram=result["persistence_diagram"],
            barcodes=result["barcodes"],
            computation_time_ms=result["computation_time_ms"]
        )
        db.add(db_computation)
        db.commit()
        
        return {
            "computation_id": computation_id,
            "algorithm": request.algorithm,
            "window_size": request.window_size,
            "persistence_diagram": result["persistence_diagram"],
            "barcodes": result["barcodes"],
            "computation_time_ms": result["computation_time_ms"],
            "metadata": result["metadata"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/computations/{computation_id}")
async def get_computation(computation_id: str, db: Session = Depends(get_db)):
    """Get stored TDA computation by ID"""
    computation = db.query(TDAComputation).filter(TDAComputation.id == computation_id).first()
    if not computation:
        raise HTTPException(status_code=404, detail="Computation not found")
    
    return {
        "id": computation.id,
        "algorithm": computation.algorithm,
        "parameters": computation.parameters,
        "persistence_diagram": computation.persistence_diagram,
        "barcodes": computation.barcodes,
        "computation_time_ms": computation.computation_time_ms,
        "created_at": computation.created_at
    }

@app.post("/compute-from-file")
async def compute_tda_from_file(
    file: UploadFile = File(...),
    algorithm: str = Form("gudhi"),
    max_dimension: int = Form(2),
    max_edge_length: Optional[float] = Form(None)
):
    """Compute TDA from uploaded file"""
    try:
        # Save uploaded file
        file_path = os.path.join(settings.upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Read and parse the file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file.filename.endswith('.json'):
            df = pd.read_json(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Convert to list of DataPoints
        data_points = []
        for _, row in df.iterrows():
            if 'x' in df.columns and 'y' in df.columns:
                z = row['z'] if 'z' in df.columns else None
                data_points.append(DataPoint(x=row['x'], y=row['y'], z=z))
            else:
                # Assume first two columns are x,y if columns not named
                data_points.append(DataPoint(x=row[0], y=row[1]))
        
        # Create request
        request = TDARequest(
            data=data_points,
            algorithm=algorithm,
            max_dimension=max_dimension,
            max_edge_length=max_edge_length
        )
        
        # Process the request
        db = SessionLocal()
        try:
            response = await compute_tda(request, db)
            return response
        finally:
            db.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up the uploaded file
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)

@app.get("/algorithms")
async def list_algorithms():
    """List available TDA algorithms"""
    return {
        "algorithms": [
            {
                "id": "gudhi",
                "name": "GUDHI",
                "description": "Comprehensive TDA library with multiple algorithms",
                "max_dimensions": 3,
                "parameters": {
                    "max_edge_length": "float: Maximum edge length for Rips complex"
                }
            },
            {
                "id": "ripser",
                "name": "Ripser",
                "description": "Efficient implementation of Vietoris-Rips persistence",
                "max_dimensions": 2,
                "parameters": {
                    "max_edge_length": "float: Maximum edge length for Rips complex"
                }
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
