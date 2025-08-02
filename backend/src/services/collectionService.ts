import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CollectionMetadata {
  name: string;
  description: string;
  filePath: string;
  originalName: string;
  postmanId?: string;
  itemCount?: number;
}

export interface CollectionData {
  id: string;
  name: string;
  description: string | null;
  filePath: string | null;
  configName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Save collection metadata to the database
 */
export const saveCollectionMetadata = async (data: CollectionMetadata): Promise<CollectionData> => {
  try {
    const collection = await prisma.collection.create({
      data: {
        name: data.name,
        description: data.description || null,
        filePath: data.filePath,
        configName: data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'), // Generate config name from collection name
      },
    });

    console.log(`📁 Collection metadata saved: ${collection.name} (ID: ${collection.id})`);
    return collection;

  } catch (error) {
    console.error('Error saving collection metadata:', error);
    throw new Error(`Failed to save collection metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get all collections from the database
 */
export const getAllCollections = async (): Promise<CollectionData[]> => {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📋 Retrieved ${collections.length} collections`);
    return collections;

  } catch (error) {
    console.error('Error fetching collections:', error);
    throw new Error(`Failed to fetch collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get a specific collection by ID
 */
export const getCollectionById = async (collectionId: string): Promise<CollectionData | null> => {
  try {
    const collection = await prisma.collection.findUnique({
      where: {
        id: collectionId,
      },
    });

    if (collection) {
      console.log(`📄 Retrieved collection: ${collection.name} (ID: ${collection.id})`);
    } else {
      console.log(`❌ Collection not found: ${collectionId}`);
    }

    return collection;

  } catch (error) {
    console.error('Error fetching collection by ID:', error);
    throw new Error(`Failed to fetch collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update collection metadata
 */
export const updateCollectionMetadata = async (
  collectionId: string, 
  updates: Partial<CollectionMetadata>
): Promise<CollectionData | null> => {
  try {
    const collection = await prisma.collection.update({
      where: {
        id: collectionId,
      },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.filePath && { filePath: updates.filePath }),
        updatedAt: new Date(),
      },
    });

    console.log(`📝 Updated collection: ${collection.name} (ID: ${collection.id})`);
    return collection;

  } catch (error) {
    console.error('Error updating collection:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return null;
    }
    
    throw new Error(`Failed to update collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete collection from database
 */
export const deleteCollectionById = async (collectionId: string): Promise<boolean> => {
  try {
    // First check if the collection exists
    const existingCollection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!existingCollection) {
      console.log(`❌ Collection not found for deletion: ${collectionId}`);
      return false;
    }

    // Delete all related runs and API results first (cascade delete)
    await prisma.aPIRunResult.deleteMany({
      where: {
        run: {
          collectionId: collectionId,
        },
      },
    });

    await prisma.run.deleteMany({
      where: {
        collectionId: collectionId,
      },
    });

    // Delete availability records
    await prisma.aPIDailyAvailability.deleteMany({
      where: {
        collectionId: collectionId,
      },
    });

    // Delete reports
    await prisma.report.deleteMany({
      where: {
        collectionId: collectionId,
      },
    });

    // Finally delete the collection
    await prisma.collection.delete({
      where: {
        id: collectionId,
      },
    });

    console.log(`🗑️ Deleted collection and all related data: ${existingCollection.name} (ID: ${collectionId})`);
    return true;

  } catch (error) {
    console.error('Error deleting collection:', error);
    throw new Error(`Failed to delete collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get collections with run statistics
 */
export const getCollectionsWithStats = async (): Promise<Array<CollectionData & { 
  runCount: number; 
  lastRunDate: Date | null; 
}>> => {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        _count: {
          select: {
            Runs: true,
          },
        },
        Runs: {
          select: {
            startTime: true,
          },
          orderBy: {
            startTime: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const collectionsWithStats = collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      filePath: collection.filePath,
      configName: collection.configName,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      runCount: collection._count.Runs,
      lastRunDate: collection.Runs[0]?.startTime || null,
    }));

    console.log(`📊 Retrieved ${collectionsWithStats.length} collections with statistics`);
    return collectionsWithStats;

  } catch (error) {
    console.error('Error fetching collections with stats:', error);
    throw new Error(`Failed to fetch collections with stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if a collection name already exists
 */
export const checkCollectionNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
  try {
    const existingCollection = await prisma.collection.findFirst({
      where: {
        name: name,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    return !!existingCollection;

  } catch (error) {
    console.error('Error checking collection name:', error);
    throw new Error(`Failed to check collection name: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};