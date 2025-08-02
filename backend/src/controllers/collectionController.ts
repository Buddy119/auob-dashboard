import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  saveCollectionMetadata,
  getAllCollections,
  getCollectionById,
  deleteCollectionById,
} from '../services/collectionService';
import { scheduleCollectionRun } from '../services/taskService';

interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    _postman_id?: string;
    schema?: string;
  };
  item: any[];
  event?: any[];
  variable?: any[];
}

interface CollectionUploadResponse {
  success: boolean;
  message: string;
  collectionId?: string;
  data?: any;
}

export const uploadCollection = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a Postman Collection JSON file.',
      } as CollectionUploadResponse);
      return;
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    try {
      // Read and parse the uploaded file
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const collectionJson: PostmanCollection = JSON.parse(rawContent);

      // Validate Postman Collection format
      if (!collectionJson.info || !collectionJson.item) {
        fs.unlinkSync(filePath); // Clean up invalid file
        res.status(400).json({
          success: false,
          message: 'Invalid Postman Collection format. Missing required "info" or "item" fields.',
        } as CollectionUploadResponse);
        return;
      }

      if (!Array.isArray(collectionJson.item)) {
        fs.unlinkSync(filePath);
        res.status(400).json({
          success: false,
          message: 'Invalid Postman Collection format. "item" field must be an array.',
        } as CollectionUploadResponse);
        return;
      }

      // Extract collection metadata
      const collectionName = collectionJson.info.name;
      const collectionDescription = collectionJson.info.description || '';
      const postmanId = collectionJson.info._postman_id;

      if (!collectionName) {
        fs.unlinkSync(filePath);
        res.status(400).json({
          success: false,
          message: 'Invalid Postman Collection. Collection name is required.',
        } as CollectionUploadResponse);
        return;
      }

      // Save collection metadata to database
      const savedCollection = await saveCollectionMetadata({
        name: collectionName,
        description: collectionDescription,
        filePath: filePath,
        originalName: originalName,
        postmanId: postmanId,
        itemCount: collectionJson.item.length,
      });

      console.log(`✅ Collection uploaded successfully: ${collectionName} (ID: ${savedCollection.id})`);

      res.status(201).json({
        success: true,
        message: 'Collection uploaded successfully.',
        collectionId: savedCollection.id,
        data: {
          id: savedCollection.id,
          name: savedCollection.name,
          description: savedCollection.description,
          itemCount: collectionJson.item.length,
          createdAt: savedCollection.createdAt,
        },
      } as CollectionUploadResponse);

    } catch (parseError) {
      // Clean up file on parse error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      if (parseError instanceof SyntaxError) {
        res.status(400).json({
          success: false,
          message: 'Invalid JSON format. Please upload a valid Postman Collection file.',
        } as CollectionUploadResponse);
        return;
      }

      throw parseError; // Re-throw other errors
    }

  } catch (error) {
    console.error('Error uploading collection:', error);

    // Clean up file on any error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Server error occurred while uploading collection.',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as CollectionUploadResponse);
  }
};

export const getCollections = async (req: Request, res: Response): Promise<void> => {
  try {
    const collections = await getAllCollections();

    res.json({
      success: true,
      data: collections,
      total: collections.length,
    });

  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collections.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getCollection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { collectionId } = req.params;

    if (!collectionId) {
      res.status(400).json({
        success: false,
        message: 'Collection ID is required.',
      });
      return;
    }

    const collection = await getCollectionById(collectionId);

    if (!collection) {
      res.status(404).json({
        success: false,
        message: 'Collection not found.',
      });
      return;
    }

    // Optionally include the actual collection content
    let collectionContent = null;
    if (collection.filePath && fs.existsSync(collection.filePath)) {
      try {
        const rawContent = fs.readFileSync(collection.filePath, 'utf-8');
        collectionContent = JSON.parse(rawContent);
      } catch (error) {
        console.warn(`Failed to read collection file: ${collection.filePath}`, error);
      }
    }

    res.json({
      success: true,
      data: {
        ...collection,
        content: collectionContent,
      },
    });

  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const runCollection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { collectionId } = req.params;
    const { environment, variables, iterations = 1 } = req.body;

    if (!collectionId) {
      res.status(400).json({
        success: false,
        message: 'Collection ID is required.',
      });
      return;
    }

    const collection = await getCollectionById(collectionId);

    if (!collection) {
      res.status(404).json({
        success: false,
        message: 'Collection not found.',
      });
      return;
    }

    if (!collection.filePath || !fs.existsSync(collection.filePath)) {
      res.status(400).json({
        success: false,
        message: 'Collection file not found on server.',
      });
      return;
    }

    // Schedule the collection run using existing task service
    const jobResult = await scheduleCollectionRun(
      collection.name, // Using collection name as config name
      {
        iterations,
        environment,
        variables,
        collectionPath: collection.filePath,
      }
    );

    res.json({
      success: true,
      message: 'Collection run scheduled successfully.',
      jobId: jobResult.jobId,
      runId: jobResult.runId,
    });

  } catch (error) {
    console.error('Error running collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run collection.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const deleteCollection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { collectionId } = req.params;

    if (!collectionId) {
      res.status(400).json({
        success: false,
        message: 'Collection ID is required.',
      });
      return;
    }

    const collection = await getCollectionById(collectionId);

    if (!collection) {
      res.status(404).json({
        success: false,
        message: 'Collection not found.',
      });
      return;
    }

    // Delete the physical file
    if (collection.filePath && fs.existsSync(collection.filePath)) {
      try {
        fs.unlinkSync(collection.filePath);
        console.log(`✅ Deleted collection file: ${collection.filePath}`);
      } catch (error) {
        console.warn(`Failed to delete collection file: ${collection.filePath}`, error);
      }
    }

    // Delete from database
    await deleteCollectionById(collectionId);

    console.log(`✅ Collection deleted successfully: ${collection.name} (ID: ${collectionId})`);

    res.json({
      success: true,
      message: 'Collection deleted successfully.',
    });

  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete collection.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};