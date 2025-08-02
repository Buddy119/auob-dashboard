export interface CollectionConfig {
  collectionFile: string;
  sslCert?: {
    certPath: string;
    keyPath: string;
    caCertPath?: string;
    passphrase?: string;
  };
  proxy?: {
    http?: string;
    https?: string;
  };
  followRedirects: boolean;
  inputSets?: Array<Record<string, string>>;
}

// Additional types for enhanced configuration management
export interface ConfigResponse {
  message: string;
  configName?: string;
  timestamp?: string;
}

export interface ConfigError {
  message: string;
  error?: string;
  details?: unknown;
}

// Input validation types
export interface InputVariableSet {
  name: string;
  variables: Record<string, string>;
}

// Extended configuration interface with metadata
export interface ExtendedCollectionConfig extends CollectionConfig {
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: string;
}

// Add name and description to base CollectionConfig
export interface CollectionConfigWithMeta extends CollectionConfig {
  name?: string;
  description?: string;
}

// Configuration validation result
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}