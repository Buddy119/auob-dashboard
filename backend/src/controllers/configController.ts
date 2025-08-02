import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { CollectionConfig, ConfigResponse, ConfigError, ExtendedCollectionConfig, ConfigValidationResult } from '../utils/types';

const configDir = path.join(__dirname, '../../configs');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Validation function for configuration
const validateConfig = (config: CollectionConfig): ConfigValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!config.collectionFile || typeof config.collectionFile !== 'string') {
    errors.push('collectionFile is required and must be a string');
  }

  if (typeof config.followRedirects !== 'boolean') {
    errors.push('followRedirects must be a boolean');
  }

  // SSL certificate validation
  if (config.sslCert) {
    if (!config.sslCert.certPath) {
      errors.push('SSL certificate path is required when SSL config is provided');
    }
    if (!config.sslCert.keyPath) {
      errors.push('SSL key path is required when SSL config is provided');
    }
  }

  // Proxy validation
  if (config.proxy) {
    if (config.proxy.http && !isValidUrl(config.proxy.http)) {
      errors.push('HTTP proxy must be a valid URL');
    }
    if (config.proxy.https && !isValidUrl(config.proxy.https)) {
      errors.push('HTTPS proxy must be a valid URL');
    }
  }

  // Input sets validation
  if (config.inputSets) {
    if (!Array.isArray(config.inputSets)) {
      errors.push('inputSets must be an array');
    } else {
      config.inputSets.forEach((set, index) => {
        if (typeof set !== 'object' || set === null) {
          errors.push(`inputSets[${index}] must be an object`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const sanitizeConfigName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
};

const createExtendedConfig = (config: CollectionConfig, name: string, isUpdate = false): ExtendedCollectionConfig => {
  const now = new Date().toISOString();
  const existingConfig = isUpdate ? getExistingConfig(name) : null;
  
  return {
    ...config,
    name,
    createdAt: existingConfig?.createdAt || now,
    updatedAt: now,
    version: '1.0'
  };
};

const getExistingConfig = (name: string): ExtendedCollectionConfig | null => {
  try {
    const filePath = path.join(configDir, `${sanitizeConfigName(name)}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Error reading existing config ${name}:`, error);
  }
  return null;
};

export const saveConfig = (req: Request, res: Response): void => {
  try {
    const configName = req.params.name;
    const config: CollectionConfig = req.body;

    if (!configName) {
      res.status(400).json({
        message: 'Configuration name is required',
        error: 'Missing configuration name parameter'
      } as ConfigError);
      return;
    }

    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.isValid) {
      res.status(400).json({
        message: 'Configuration validation failed',
        error: 'Invalid configuration data',
        details: validation.errors
      } as ConfigError);
      return;
    }

    const sanitizedName = sanitizeConfigName(configName);
    const extendedConfig = createExtendedConfig(config, configName);
    const filePath = path.join(configDir, `${sanitizedName}.json`);

    // Check if config already exists
    if (fs.existsSync(filePath)) {
      res.status(409).json({
        message: 'Configuration already exists. Use PUT to update.',
        error: 'Configuration conflict'
      } as ConfigError);
      return;
    }

    fs.writeFileSync(filePath, JSON.stringify(extendedConfig, null, 2));
    
    res.status(201).json({
      message: 'Configuration saved successfully',
      configName: sanitizedName,
      timestamp: new Date().toISOString()
    } as ConfigResponse);

  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({
      message: 'Internal server error while saving configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ConfigError);
  }
};

export const getConfig = (req: Request, res: Response): void => {
  try {
    const configName = req.params.name;

    if (!configName) {
      res.status(400).json({
        message: 'Configuration name is required',
        error: 'Missing configuration name parameter'
      } as ConfigError);
      return;
    }

    const sanitizedName = sanitizeConfigName(configName);
    const filePath = path.join(configDir, `${sanitizedName}.json`);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        message: 'Configuration not found',
        error: `Configuration '${configName}' does not exist`
      } as ConfigError);
      return;
    }

    const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.status(200).json(config);

  } catch (error) {
    console.error('Error retrieving configuration:', error);
    res.status(500).json({
      message: 'Internal server error while retrieving configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ConfigError);
  }
};

export const updateConfig = (req: Request, res: Response): void => {
  try {
    const configName = req.params.name;
    const config: CollectionConfig = req.body;

    if (!configName) {
      res.status(400).json({
        message: 'Configuration name is required',
        error: 'Missing configuration name parameter'
      } as ConfigError);
      return;
    }

    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.isValid) {
      res.status(400).json({
        message: 'Configuration validation failed',
        error: 'Invalid configuration data',
        details: validation.errors
      } as ConfigError);
      return;
    }

    const sanitizedName = sanitizeConfigName(configName);
    const filePath = path.join(configDir, `${sanitizedName}.json`);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        message: 'Configuration not found',
        error: `Configuration '${configName}' does not exist`
      } as ConfigError);
      return;
    }

    const extendedConfig = createExtendedConfig(config, configName, true);
    fs.writeFileSync(filePath, JSON.stringify(extendedConfig, null, 2));
    
    res.status(200).json({
      message: 'Configuration updated successfully',
      configName: sanitizedName,
      timestamp: new Date().toISOString()
    } as ConfigResponse);

  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({
      message: 'Internal server error while updating configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ConfigError);
  }
};

export const deleteConfig = (req: Request, res: Response): void => {
  try {
    const configName = req.params.name;

    if (!configName) {
      res.status(400).json({
        message: 'Configuration name is required',
        error: 'Missing configuration name parameter'
      } as ConfigError);
      return;
    }

    const sanitizedName = sanitizeConfigName(configName);
    const filePath = path.join(configDir, `${sanitizedName}.json`);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        message: 'Configuration not found',
        error: `Configuration '${configName}' does not exist`
      } as ConfigError);
      return;
    }

    fs.unlinkSync(filePath);
    
    res.status(200).json({
      message: 'Configuration deleted successfully',
      configName: sanitizedName,
      timestamp: new Date().toISOString()
    } as ConfigResponse);

  } catch (error) {
    console.error('Error deleting configuration:', error);
    res.status(500).json({
      message: 'Internal server error while deleting configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ConfigError);
  }
};

export const listConfigs = (req: Request, res: Response): void => {
  try {
    const files = fs.readdirSync(configDir);
    const configs = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const configName = file.replace('.json', '');
        const filePath = path.join(configDir, file);
        const stats = fs.statSync(filePath);
        
        try {
          const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            name: configName,
            displayName: config.name || configName,
            description: config.description,
            createdAt: config.createdAt || stats.birthtime.toISOString(),
            updatedAt: config.updatedAt || stats.mtime.toISOString(),
            size: stats.size
          };
        } catch (error) {
          return {
            name: configName,
            displayName: configName,
            error: 'Failed to parse configuration',
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
            size: stats.size
          };
        }
      });

    res.status(200).json({
      configs,
      total: configs.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error listing configurations:', error);
    res.status(500).json({
      message: 'Internal server error while listing configurations',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ConfigError);
  }
};