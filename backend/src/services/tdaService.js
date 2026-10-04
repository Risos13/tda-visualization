const fs = require('fs');
const path = require('path');

/**
 * Simplified TDA Service for MVP
 * Note: This is a basic implementation for demonstration.
 * Production version should integrate with libraries like GUDHI or scikit-tda.
 */
class TDAService {
  
  /**
   * Parse dataset file and extract point cloud data
   * @param {string} filePath - Path to the dataset file
   * @returns {Array} Array of points
   */
  async parseDataset(filePath) {
    console.log(`[TDA] Parsing dataset from file: ${filePath}`);
    
    try {
      // Validate file path
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }
      
      console.log(`[TDA] Checking if file exists: ${filePath}`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Get file stats for logging
      const stats = fs.statSync(filePath);
      console.log(`[TDA] File size: ${stats.size} bytes`);
      
      // Read file content
      console.log('[TDA] Reading file content...');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      console.log(`[TDA] Read ${fileContent.length} characters`);
      
      const extension = path.extname(filePath).toLowerCase();
      console.log(`[TDA] File extension: ${extension}`);
      
      let points = [];
      
      switch (extension) {
        case '.json':
          console.log('[TDA] Parsing JSON file...');
          try {
            const jsonData = JSON.parse(fileContent);
            console.log('[TDA] Successfully parsed JSON');
            
            // Case 1: Direct array of points
            if (Array.isArray(jsonData)) {
              points = jsonData;
              console.log(`[TDA] Loaded ${points.length} points from JSON array`);
            }
            // Case 2: Object with 'points' array
            else if (jsonData.points && Array.isArray(jsonData.points)) {
              points = jsonData.points;
              console.log(`[TDA] Loaded ${points.length} points from JSON object with 'points' key`);
            }
            // Case 3: Graph structure with nodes
            else if (jsonData.nodes && Array.isArray(jsonData.nodes)) {
              console.log('[TDA] Detected graph structure with nodes');
              points = jsonData.nodes.map(node => {
                // Try to extract coordinates from node data
                if (node.position && Array.isArray(node.position)) {
                  return node.position; // Use position array if available
                } else if (node.x !== undefined && node.y !== undefined) {
                  return [node.x, node.y, node.z || 0]; // Use x,y,z coordinates
                } else if (node.data && node.data.position) {
                  return node.data.position; // Try nested position
                }
                return null;
              }).filter(point => point !== null);
              
              console.log(`[TDA] Extracted ${points.length} points from graph nodes`);
            }
            // Case 4: Try to find any array in the object
            else {
              // Look for the first array property that contains point-like arrays
              const arrayProps = Object.values(jsonData).filter(
                prop => Array.isArray(prop) && prop.length > 0 && Array.isArray(prop[0])
              );
              
              if (arrayProps.length > 0) {
                points = arrayProps[0];
                console.log(`[TDA] Using first array property with ${points.length} points`);
              } else {
                console.warn('[TDA] Could not find valid point data in JSON structure');
                console.warn('[TDA] JSON keys:', Object.keys(jsonData));
                throw new Error('No valid point data found in JSON structure');
              }
            }
            
            // Validate points format
            if (points.length > 0) {
              const validPoints = points.filter(p => 
                Array.isArray(p) && p.length >= 2 && p.every(coord => typeof coord === 'number')
              );
              
              if (validPoints.length !== points.length) {
                console.warn(`[TDA] Filtered ${points.length - validPoints.length} invalid points`);
                points = validPoints;
              }
              
              if (points.length === 0) {
                throw new Error('No valid points found after validation');
              }
              
              // Ensure all points have same dimension (pad with zeros if needed)
              const maxDim = Math.max(...points.map(p => p.length));
              points = points.map(p => {
                if (p.length < maxDim) {
                  return [...p, ...Array(maxDim - p.length).fill(0)];
                }
                return p;
              });
              
              console.log(`[TDA] Final point cloud: ${points.length} points with ${points[0].length} dimensions`);
            }
            
          } catch (e) {
            console.error('[TDA] JSON parse error:', e);
            throw new Error(`Failed to parse JSON: ${e.message}`);
          }
          break;
          
        case '.csv':
          console.log('[TDA] Parsing CSV file...');
          const lines = fileContent.split('\n').filter(line => line.trim());
          console.log(`[TDA] Found ${lines.length} non-empty lines`);
          
          // Skip header if present
          const hasHeader = lines[0].includes(',') && isNaN(parseFloat(lines[0].split(',')[0]));
          const startIndex = hasHeader ? 1 : 0;
          
          if (hasHeader) {
            console.log(`[TDA] Detected header row: ${lines[0]}`);
          }
          
          points = lines.slice(startIndex).map((line, i) => {
            const values = line.split(',').map(val => {
              const trimmed = val.trim();
              const num = parseFloat(trimmed);
              if (isNaN(num)) {
                console.warn(`[TDA] Warning: Non-numeric value '${trimmed}' in line ${i + 1 + startIndex}`);
              }
              return num;
            }).filter(val => !isNaN(val));
            
            if (values.length < 2) {
              console.warn(`[TDA] Warning: Line ${i + 1 + startIndex} has less than 2 valid numbers`);
              return null;
            }
            
            return values;
          }).filter(point => point !== null);
          
          console.log(`[TDA] Successfully parsed ${points.length} points from CSV`);
          break;
          
        case '.txt':
          const txtLines = fileContent.split('\n').filter(line => line.trim());
          points = txtLines.map(line => {
            return line.split(/\s+/).map(val => parseFloat(val)).filter(val => !isNaN(val));
          }).filter(point => point.length > 0);
          break;
          
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.svg':
          // Convert image to grayscale point cloud
          points = await this.processImageToPoints(filePath);
          break;
          
        case '.gexf':
        case '.graphml':
        case '.graph':
          // Process graph files
          points = await this.processGraphFile(filePath);
          break;
          
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }
      
      if (!points || points.length === 0) {
        throw new Error('No valid points found in dataset');
      }
      
      return points;
    } catch (error) {
      throw new Error(`Failed to parse dataset: ${error.message}`);
    }
  }
  
  /**
   * Compute Euclidean distance between two points
   * @param {Array} p1 - First point
   * @param {Array} p2 - Second point
   * @returns {number} Euclidean distance
   */
  euclideanDistance(p1, p2) {
    if (p1.length !== p2.length) {
      throw new Error('Points must have same dimension');
    }
    
    return Math.sqrt(p1.reduce((sum, val, i) => sum + Math.pow(val - p2[i], 2), 0));
  }
  
  /**
   * Build distance matrix for point cloud
   * @param {Array} points - Array of points
   * @returns {Array} Distance matrix
   */
  buildDistanceMatrix(points) {
    const n = points.length;
    const matrix = Array(n).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.euclideanDistance(points[i], points[j]);
        matrix[i][j] = dist;
        matrix[j][i] = dist;
      }
    }
    
    return matrix;
  }
  
  /**
   * Simplified persistent homology computation
   * This is a basic implementation for demonstration purposes
   * @param {Array} points - Point cloud data
   * @returns {Object} TDA results with persistence diagram and barcodes
   */
  async computePersistentHomology(points) {
    try {
      console.log('[TDA] Starting TDA computation');
      
      // Basic validation
      if (!points || !Array.isArray(points)) {
        throw new Error('Invalid points array');
      }
      
      if (points.length < 2) {
        throw new Error('Need at least 2 points for TDA computation');
      }
      
      // Validate each point
      points.forEach((point, i) => {
        if (!Array.isArray(point) || point.length === 0) {
          throw new Error(`Invalid point at index ${i}: not an array or empty`);
        }
        
        point.forEach((coord, j) => {
          if (typeof coord !== 'number' || isNaN(coord)) {
            throw new Error(`Invalid coordinate at point[${i}][${j}]: ${coord}`);
          }
        });
      });
      
      const dimension = points[0].length;
      console.log(`[TDA] Processing ${points.length} points in ${dimension} dimensions`);
      
      const distanceMatrix = this.buildDistanceMatrix(points);
      console.log('[TDA] Distance matrix built successfully');
      
      // Simplified persistence computation
      console.log('[TDA] Computing persistence pairs...');
      const persistencePairs = this.computeSimplifiedPersistence(distanceMatrix, points);
      console.log(`[TDA] Generated ${persistencePairs.length} persistence pairs`);
      
      // Generate persistence diagram
      const persistenceDiagram = persistencePairs.map((pair, index) => ({
        dimension: pair.dimension,
        birth: pair.birth,
        death: pair.death === Infinity ? -1 : pair.death, // -1 represents infinity
        id: index
      }));
      
      // Generate barcodes
      console.log('[TDA] Generating barcodes...');
      const barcodes = this.generateBarcodes(persistencePairs);
      
      console.log('[TDA] TDA computation completed successfully');
      return {
        persistenceDiagram,
        barcodes,
        metadata: {
          pointCount: points.length,
          dimension: dimension,
          computedAt: new Date(),
          algorithm: 'simplified_rips'
        }
      };
    } catch (error) {
      throw new Error(`TDA computation failed: ${error.message}`);
    }
  }
  
  /**
   * Simplified persistence computation (for demonstration)
   * @param {Array} distanceMatrix - Distance matrix
   * @param {Array} points - Original points
   * @returns {Array} Persistence pairs
   */
  computeSimplifiedPersistence(distanceMatrix, points) {
    const n = points.length;
    const pairs = [];
    
    // Validate distance matrix
    if (!distanceMatrix || !Array.isArray(distanceMatrix) || distanceMatrix.length !== n) {
      throw new Error('Invalid distance matrix');
    }
    
    // Generate some sample persistence pairs based on distance distribution
    const distances = [];
    for (let i = 0; i < n; i++) {
      if (!Array.isArray(distanceMatrix[i]) || distanceMatrix[i].length !== n) {
        throw new Error(`Invalid distance matrix row at index ${i}`);
      }
      
      for (let j = i + 1; j < n; j++) {
        const dist = distanceMatrix[i][j];
        if (typeof dist !== 'number' || isNaN(dist) || dist < 0) {
          throw new Error(`Invalid distance at [${i}][${j}]: ${dist}`);
        }
        distances.push(dist);
      }
    }
    
    distances.sort((a, b) => a - b);
    const minDist = distances[0];
    const maxDist = distances[distances.length - 1];
    const avgDist = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    
    // Dimension 0 (connected components)
    pairs.push({
      dimension: 0,
      birth: 0,
      death: minDist * 0.5
    });
    
    // Add some H0 features
    for (let i = 1; i < Math.min(5, n); i++) {
      pairs.push({
        dimension: 0,
        birth: 0,
        death: distances[Math.floor(i * distances.length / 10)]
      });
    }
    
    // Dimension 1 (loops) - if we have enough points
    if (n >= 4) {
      pairs.push({
        dimension: 1,
        birth: avgDist * 0.8,
        death: maxDist * 0.9
      });
      
      if (n >= 6) {
        pairs.push({
          dimension: 1,
          birth: avgDist * 1.2,
          death: Infinity // Infinite persistence
        });
      }
    }
    
    return pairs.sort((a, b) => a.birth - b.birth);
  }
  
  /**
   * Generate barcode representation
   * @param {Array} persistencePairs - Persistence pairs
   * @returns {Array} Barcode data grouped by dimension
   */
  generateBarcodes(persistencePairs) {
    const barcodesByDim = {};
    
    persistencePairs.forEach(pair => {
      if (!barcodesByDim[pair.dimension]) {
        barcodesByDim[pair.dimension] = [];
      }
      
      barcodesByDim[pair.dimension].push([
        pair.birth,
        pair.death === Infinity ? -1 : pair.death
      ]);
    });
    
    return Object.keys(barcodesByDim).map(dim => ({
      dimension: parseInt(dim),
      intervals: barcodesByDim[dim]
    }));
  }

  /**
   * Process image to point cloud
   * @param {string} filePath - Path to the image file
   * @returns {Array} Array of points (x, y, intensity)
   */
  async processImageToPoints(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Image file not found: ${filePath}`);
    }

    try {
      // Dynamically import canvas to handle cases where it's not available
      const { createCanvas, loadImage } = await import('canvas');
      
      const img = await loadImage(filePath);
      if (!img || !img.width || !img.height) {
        throw new Error('Invalid image dimensions');
      }

      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      
      if (!data || data.length === 0) {
        throw new Error('Failed to extract image data');
      }
      
      // Convert to grayscale and create points (x, y, intensity)
      const points = [];
      const width = img.width;
      const height = img.height;
      
      // Limit the number of points to prevent memory issues with large images
      const maxPoints = 10000;
      const step = Math.max(1, Math.ceil(Math.sqrt((width * height) / maxPoints)));
      
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const i = (y * width + x) * 4;
          if (i + 3 < data.length) { // Ensure we don't go out of bounds
            // Convert to grayscale using luminance formula
            const intensity = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            // Only include points above a certain intensity threshold to reduce noise
            if (intensity < 250) { // Skip white/background pixels
              points.push([x, y, intensity]);
            }
          }
        }
      }
      
      if (points.length === 0) {
        throw new Error('No significant features found in the image. The image might be too bright or blank.');
      }
      
      return points;
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }
  
  /**
   * Process graph file (GEXF, GraphML, or JSON)
   * @param {string} filePath - Path to the graph file
   * @returns {Array} Array of points (x, y, z) for nodes
   */
  async processGraphFile(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Graph file not found: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const extension = path.extname(filePath).toLowerCase();
    
    try {
      if (extension === '.json') {
        // Parse JSON graph
        const graphData = JSON.parse(fileContent);
        
        // Handle different graph formats
        if (graphData.nodes && Array.isArray(graphData.nodes)) {
          // Standard graph format with nodes array
          return graphData.nodes.map(node => {
            // Use node position if available, otherwise generate random position
            const x = node.x || Math.random() * 100;
            const y = node.y || Math.random() * 100;
            const z = node.z || 0;
            return [x, y, z];
          });
        } else if (Array.isArray(graphData)) {
          // Array of nodes
          return graphData.map(node => {
            const x = node.x || Math.random() * 100;
            const y = node.y || Math.random() * 100;
            const z = node.z || 0;
            return [x, y, z];
          });
        } else {
          throw new Error('Unsupported graph format');
        }
      } else if (extension === '.gexf' || extension === '.graphml') {
        // For GEXF and GraphML, we'll need to parse the XML
        // This is a simplified version - in production, use a proper XML parser
        const nodes = [];
        const nodeRegex = /<node\s+id="([^"]+)"(?:\s+label="([^"]*)")?/g;
        let match;
        
        while ((match = nodeRegex.exec(fileContent)) !== null) {
          const id = match[1];
          const label = match[2] || `Node ${nodes.length}`;
          // Generate random position for now
          nodes.push([
            Math.random() * 100,
            Math.random() * 100,
            0
          ]);
        }
        
        if (nodes.length === 0) {
          throw new Error('No nodes found in graph file');
        }
        
        return nodes;
      } else {
        throw new Error(`Unsupported graph file format: ${extension}`);
      }
    } catch (error) {
      console.error('Graph processing error:', error);
      throw new Error(`Failed to process graph file: ${error.message}`);
    }
  }
}

module.exports = new TDAService();
