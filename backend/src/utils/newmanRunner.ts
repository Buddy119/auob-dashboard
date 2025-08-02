import * as newman from 'newman';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { CollectionConfig, CollectionConfigWithMeta } from './types';

const prisma = new PrismaClient();

interface NewmanRunResult {
  success: boolean;
  runId: string;
  summary: any;
  error?: string;
  timestamp: string;
  configName: string;
}

/**
 * Execute a Postman Collection using Newman with the given configuration
 */
export const runCollectionTask = async (configName: string): Promise<NewmanRunResult> => {
  console.log(`🚀 Starting Newman collection execution for config: ${configName}`);
  
  const startTime = Date.now();
  
  try {
    // Load configuration
    const config = await loadConfiguration(configName);
    if (!config) {
      throw new Error(`Configuration '${configName}' not found`);
    }

    // Validate collection file exists
    const collectionPath = path.resolve(__dirname, '../../', config.collectionFile);
    if (!fs.existsSync(collectionPath)) {
      throw new Error(`Collection file not found: ${config.collectionFile}`);
    }

    // Find or create collection record
    const collection = await findOrCreateCollection(configName, config as CollectionConfigWithMeta);
    
    // Process each input variable set
    const inputSets = config.inputSets || [{}]; // Default to empty set if none provided
    
    for (let i = 0; i < inputSets.length; i++) {
      const variableSet = inputSets[i];
      const variableSetName = `Set ${i + 1}`;
      
      console.log(`📊 Processing variable set ${i + 1}/${inputSets.length}: ${variableSetName}`);
      
      await executeCollectionWithVariables(
        collection.id,
        configName,
        variableSetName,
        config,
        variableSet,
        collectionPath
      );
    }

    const executionTime = Date.now() - startTime;
    console.log(`✅ Newman collection execution completed for config: ${configName} in ${executionTime}ms`);
    
    return {
      success: true,
      runId: collection.id,
      summary: { executionTime, inputSetsProcessed: inputSets.length },
      timestamp: new Date().toISOString(),
      configName
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Newman collection execution failed for config: ${configName}`, error);
    
    return {
      success: false,
      runId: '',
      summary: { executionTime },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      configName
    };
  }
};

/**
 * Load configuration from JSON file
 */
const loadConfiguration = async (configName: string): Promise<CollectionConfig | null> => {
  try {
    const configPath = path.join(__dirname, '../../configs', `${configName}.json`);
    
    if (!fs.existsSync(configPath)) {
      console.error(`Configuration file not found: ${configPath}`);
      return null;
    }

    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);
    
    console.log(`📄 Loaded configuration: ${configName}`);
    return config;
  } catch (error) {
    console.error(`Error loading configuration '${configName}':`, error);
    return null;
  }
};

/**
 * Find existing collection or create new one
 */
const findOrCreateCollection = async (configName: string, config: CollectionConfigWithMeta) => {
  try {
    // Try to find existing collection
    let collection = await prisma.collection.findFirst({
      where: { configName }
    });

    if (!collection) {
      // Create new collection record
      collection = await prisma.collection.create({
        data: {
          name: config.name || configName,
          description: config.description || `Collection for ${configName}`,
          filePath: config.collectionFile,
          configName
        }
      });
      console.log(`📝 Created new collection record: ${collection.id}`);
    }

    return collection;
  } catch (error) {
    console.error('Error finding/creating collection:', error);
    throw error;
  }
};

/**
 * Execute collection with specific variable set
 */
const executeCollectionWithVariables = async (
  collectionId: string,
  configName: string,
  variableSetName: string,
  config: CollectionConfig,
  variables: Record<string, string>,
  collectionPath: string
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // Create run record
    let runRecord: any = null;
    
    const startRunTime = new Date();
    
    // Prepare Newman options
    const newmanOptions = buildNewmanOptions(config, variables, collectionPath);
    
    console.log(`🔄 Executing Newman with ${Object.keys(variables).length} variables`);
    
    newman.run(newmanOptions, async (err, summary) => {
      try {
        if (err) {
          console.error('Newman execution failed:', err);
          
          // Create failed run record
          await prisma.run.create({
            data: {
              collectionId,
              configName,
              variableSetName,
              status: 'FAILED',
              startTime: startRunTime,
              endTime: new Date(),
              errorMessage: err.message
            }
          });
          
          reject(err);
          return;
        }

        // Calculate run statistics
        const totalRequests = summary.run.executions.length;
        const failedRequests = summary.run.failures.length;
        const passedRequests = totalRequests - failedRequests;
        const totalTime = (summary.run.timings?.completed || 0) - (summary.run.timings?.started || 0);

        // Create successful run record
        runRecord = await prisma.run.create({
          data: {
            collectionId,
            configName,
            variableSetName,
            status: 'COMPLETED',
            startTime: startRunTime,
            endTime: new Date(),
            totalRequests,
            passedRequests,
            failedRequests,
            totalTime: Math.round(totalTime)
          }
        });

        console.log(`📊 Run created: ${runRecord.id} (${passedRequests}/${totalRequests} passed)`);

        // Store individual request results
        for (const execution of summary.run.executions) {
          await storeApiResult(runRecord.id, execution);
        }

        console.log(`✅ Stored ${totalRequests} API results for run ${runRecord.id}`);
        
        resolve();
      } catch (dbError) {
        console.error('Database error during Newman result processing:', dbError);
        reject(dbError);
      }
    });
  });
};

/**
 * Build Newman execution options from configuration
 */
const buildNewmanOptions = (
  config: CollectionConfig,
  variables: Record<string, string>,
  collectionPath: string
): any => {
  const options: any = {
    collection: require(collectionPath),
    reporters: ['cli'],
    reporter: {
      cli: {
        noSummary: false,
        noFailures: false,
        noAssertions: false
      }
    }
  };

  // Add environment variables
  if (Object.keys(variables).length > 0) {
    options.environment = {
      values: Object.entries(variables).map(([key, value]) => ({
        key,
        value,
        enabled: true
      }))
    };
  }

  // Add SSL configuration
  if (config.sslCert) {
    if (config.sslCert.certPath) {
      options.sslClientCert = config.sslCert.certPath;
    }
    if (config.sslCert.keyPath) {
      options.sslClientKey = config.sslCert.keyPath;
    }
    if (config.sslCert.caCertPath) {
      options.sslExtraCaCerts = [config.sslCert.caCertPath];
    }
    if (config.sslCert.passphrase) {
      options.sslClientPassphrase = config.sslCert.passphrase;
    }
  }

  // Add proxy configuration
  if (config.proxy) {
    options.proxies = config.proxy;
  }

  // Configure redirect behavior
  if (typeof config.followRedirects === 'boolean') {
    options.ignoreRedirects = !config.followRedirects;
  }

  return options;
};

/**
 * Store individual API execution result in database
 */
const storeApiResult = async (runId: string, execution: any): Promise<void> => {
  try {
    const request = execution.request;
    const response = execution.response;
    const item = execution.item;
    
    // Extract response body safely
    let responseBody = '';
    try {
      if (response && response.stream) {
        responseBody = response.stream.toString('utf8');
        // Limit response body size to prevent database issues
        if (responseBody.length > 50000) {
          responseBody = responseBody.substring(0, 50000) + '... [truncated]';
        }
      }
    } catch (bodyError) {
      console.warn('Failed to extract response body:', bodyError);
      responseBody = '[Body extraction failed]';
    }

    // Extract response headers
    let responseHeaders = {};
    try {
      if (response && response.headers && response.headers.all) {
        responseHeaders = response.headers.all();
      }
    } catch (headerError) {
      console.warn('Failed to extract response headers:', headerError);
    }

    // Process assertions
    let assertionResults = [];
    let success = true;
    let errorMessage = null;

    if (execution.assertions) {
      assertionResults = execution.assertions.map((assertion: any) => ({
        assertion: assertion.assertion,
        error: assertion.error ? assertion.error.message : null,
        passed: !assertion.error
      }));
      
      success = execution.assertions.every((a: any) => !a.error);
      
      if (!success) {
        errorMessage = execution.assertions
          .filter((a: any) => a.error)
          .map((a: any) => a.error.message)
          .join('; ');
      }
    }

    // Create API result record
    await prisma.aPIRunResult.create({
      data: {
        runId,
        itemName: item.name || 'Unknown Item',
        requestName: request.name || item.name || 'Unknown Request',
        method: request.method || 'UNKNOWN',
        url: request.url ? request.url.toString() : 'Unknown URL',
        statusCode: response ? response.code : null,
        responseTime: response && response.responseTime ? response.responseTime : null,
        success,
        errorMessage,
        responseBody: responseBody || null,
        responseHeaders: Object.keys(responseHeaders).length > 0 ? JSON.stringify(responseHeaders) : undefined,
        assertions: assertionResults.length > 0 ? JSON.stringify(assertionResults) : undefined
      }
    });

  } catch (error) {
    console.error('Error storing API result:', error);
    // Don't throw here to avoid breaking the entire run
  }
};

/**
 * Clean up temporary files and resources
 */
export const cleanupTempFiles = (configName: string): void => {
  try {
    const tempDir = path.join(__dirname, '../../temp');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        // Clean up files older than 1 hour
        if (stats.mtime < new Date(Date.now() - 3600000)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Cleaned up temp file: ${file}`);
        }
      });
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
};

/**
 * Validate collection file exists and is valid JSON
 */
export const validateCollectionFile = (collectionPath: string): boolean => {
  try {
    const fullPath = path.resolve(__dirname, '../../', collectionPath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`Collection file not found: ${fullPath}`);
      return false;
    }

    const collectionData = fs.readFileSync(fullPath, 'utf-8');
    const collection = JSON.parse(collectionData);
    
    if (!collection.info || !collection.item) {
      console.error('Invalid Postman collection format - missing info or item');
      return false;
    }

    console.log(`✅ Collection file validated: ${collection.info.name}`);
    return true;
  } catch (error) {
    console.error('Error validating collection file:', error);
    return false;
  }
};

/**
 * Get run statistics for a collection
 */
export const getCollectionRunStats = async (configName: string) => {
  try {
    const collection = await prisma.collection.findFirst({
      where: { configName },
      include: {
        Runs: {
          include: {
            apiResults: true
          }
        }
      }
    });

    if (!collection) {
      return null;
    }

    const totalRuns = collection.Runs.length;
    const completedRuns = collection.Runs.filter(run => run.status === 'COMPLETED').length;
    const failedRuns = collection.Runs.filter(run => run.status === 'FAILED').length;
    const totalRequests = collection.Runs.reduce((sum, run) => sum + run.totalRequests, 0);
    const totalPassedRequests = collection.Runs.reduce((sum, run) => sum + run.passedRequests, 0);

    return {
      configName,
      totalRuns,
      completedRuns,
      failedRuns,
      totalRequests,
      totalPassedRequests,
      successRate: totalRequests > 0 ? (totalPassedRequests / totalRequests) * 100 : 0,
      lastRunTime: collection.Runs.length > 0 
        ? collection.Runs[collection.Runs.length - 1].startTime 
        : null
    };
  } catch (error) {
    console.error('Error getting collection run stats:', error);
    return null;
  }
};

export default { 
  runCollectionTask, 
  cleanupTempFiles, 
  validateCollectionFile,
  getCollectionRunStats 
};