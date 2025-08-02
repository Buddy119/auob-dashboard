import React, { useState } from 'react';

interface InputVariable {
  key: string;
  value: string;
}

interface InputVariableSet {
  id: string;
  name: string;
  variables: InputVariable[];
}

interface CollectionUploaderProps {
  onSubmit?: (data: FormData) => void;
}

const CollectionUploader: React.FC<CollectionUploaderProps> = ({ onSubmit }) => {
  const [collectionFile, setCollectionFile] = useState<File | null>(null);
  const [sslCertFile, setSslCertFile] = useState<File | null>(null);
  const [sslKeyFile, setSslKeyFile] = useState<File | null>(null);
  const [caCertFile, setCaCertFile] = useState<File | null>(null);
  const [sslPassphrase, setSslPassphrase] = useState('');
  const [httpProxy, setHttpProxy] = useState('');
  const [httpsProxy, setHttpsProxy] = useState('');
  const [followRedirects, setFollowRedirects] = useState(true);
  const [inputVariableSets, setInputVariableSets] = useState<InputVariableSet[]>([
    { id: '1', name: 'Default Set', variables: [{ key: '', value: '' }] }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateFile = (file: File | null, fieldName: string, required = false): boolean => {
    if (required && !file) {
      setErrors(prev => ({ ...prev, [fieldName]: `${fieldName} is required` }));
      return false;
    }
    if (file && fieldName === 'collectionFile' && !file.name.endsWith('.json')) {
      setErrors(prev => ({ ...prev, [fieldName]: 'Collection file must be a JSON file' }));
      return false;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [fieldName]: 'File size must be less than 10MB' }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    return true;
  };

  const handleCollectionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCollectionFile(file);
    validateFile(file, 'collectionFile', true);
  };

  const handleSslCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSslCertFile(file);
    validateFile(file, 'sslCertFile');
  };

  const handleSslKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSslKeyFile(file);
    validateFile(file, 'sslKeyFile');
  };

  const handleCaCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCaCertFile(file);
    validateFile(file, 'caCertFile');
  };

  const addInputVariableSet = () => {
    const newSet: InputVariableSet = {
      id: Date.now().toString(),
      name: `Variable Set ${inputVariableSets.length + 1}`,
      variables: [{ key: '', value: '' }]
    };
    setInputVariableSets([...inputVariableSets, newSet]);
  };

  const removeInputVariableSet = (setId: string) => {
    if (inputVariableSets.length > 1) {
      setInputVariableSets(inputVariableSets.filter(set => set.id !== setId));
    }
  };

  const updateInputVariableSetName = (setId: string, name: string) => {
    setInputVariableSets(sets => 
      sets.map(set => set.id === setId ? { ...set, name } : set)
    );
  };

  const addVariableToSet = (setId: string) => {
    setInputVariableSets(sets =>
      sets.map(set =>
        set.id === setId
          ? { ...set, variables: [...set.variables, { key: '', value: '' }] }
          : set
      )
    );
  };

  const removeVariableFromSet = (setId: string, variableIndex: number) => {
    setInputVariableSets(sets =>
      sets.map(set =>
        set.id === setId
          ? { ...set, variables: set.variables.filter((_, index) => index !== variableIndex) }
          : set
      )
    );
  };

  const updateVariable = (setId: string, variableIndex: number, field: 'key' | 'value', value: string) => {
    setInputVariableSets(sets =>
      sets.map(set =>
        set.id === setId
          ? {
              ...set,
              variables: set.variables.map((variable, index) =>
                index === variableIndex ? { ...variable, [field]: value } : variable
              )
            }
          : set
      )
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!collectionFile) {
      newErrors.collectionFile = 'Postman Collection file is required';
    }

    if (httpProxy && !httpProxy.startsWith('http://') && !httpProxy.startsWith('https://')) {
      newErrors.httpProxy = 'HTTP proxy must start with http:// or https://';
    }

    if (httpsProxy && !httpsProxy.startsWith('http://') && !httpsProxy.startsWith('https://')) {
      newErrors.httpsProxy = 'HTTPS proxy must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      
      if (collectionFile) {
        formData.append('collection', collectionFile);
      }
      
      if (sslCertFile) {
        formData.append('sslCert', sslCertFile);
      }
      
      if (sslKeyFile) {
        formData.append('sslKey', sslKeyFile);
      }
      
      if (caCertFile) {
        formData.append('caCert', caCertFile);
      }

      const config = {
        sslPassphrase,
        httpProxy,
        httpsProxy,
        followRedirects,
        inputVariableSets: inputVariableSets.filter(set => 
          set.variables.some(variable => variable.key.trim() !== '')
        )
      };

      formData.append('config', JSON.stringify(config));

      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Postman Collection</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Collection File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Postman Collection File *
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleCollectionFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {errors.collectionFile && (
            <p className="mt-1 text-sm text-red-600">{errors.collectionFile}</p>
          )}
        </div>

        {/* SSL Configuration */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">SSL Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SSL Certificate
              </label>
              <input
                type="file"
                onChange={handleSslCertFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {errors.sslCertFile && (
                <p className="mt-1 text-sm text-red-600">{errors.sslCertFile}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SSL Key
              </label>
              <input
                type="file"
                onChange={handleSslKeyFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {errors.sslKeyFile && (
                <p className="mt-1 text-sm text-red-600">{errors.sslKeyFile}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CA Certificate
              </label>
              <input
                type="file"
                onChange={handleCaCertFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {errors.caCertFile && (
                <p className="mt-1 text-sm text-red-600">{errors.caCertFile}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SSL Passphrase
              </label>
              <input
                type="password"
                value={sslPassphrase}
                onChange={(e) => setSslPassphrase(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter SSL passphrase"
              />
            </div>
          </div>
        </div>

        {/* Proxy Configuration */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Proxy Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTTP Proxy
              </label>
              <input
                type="text"
                value={httpProxy}
                onChange={(e) => setHttpProxy(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="http://proxy.example.com:8080"
              />
              {errors.httpProxy && (
                <p className="mt-1 text-sm text-red-600">{errors.httpProxy}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTTPS Proxy
              </label>
              <input
                type="text"
                value={httpsProxy}
                onChange={(e) => setHttpsProxy(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://proxy.example.com:8080"
              />
              {errors.httpsProxy && (
                <p className="mt-1 text-sm text-red-600">{errors.httpsProxy}</p>
              )}
            </div>
          </div>
        </div>

        {/* Redirect Policy */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Settings</h3>
          
          <div className="flex items-center">
            <input
              id="followRedirects"
              type="checkbox"
              checked={followRedirects}
              onChange={(e) => setFollowRedirects(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="followRedirects" className="ml-2 block text-sm text-gray-700">
              Follow HTTP redirects
            </label>
          </div>
        </div>

        {/* Input Variable Sets */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Input Variable Sets</h3>
            <button
              type="button"
              onClick={addInputVariableSet}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Add Variable Set
            </button>
          </div>

          {inputVariableSets.map((set) => (
            <div key={set.id} className="mb-6 p-4 border border-gray-200 rounded-md">
              <div className="flex justify-between items-center mb-3">
                <input
                  type="text"
                  value={set.name}
                  onChange={(e) => updateInputVariableSetName(set.id, e.target.value)}
                  className="text-md font-medium text-gray-800 bg-transparent border-none focus:outline-none focus:ring-0"
                />
                {inputVariableSets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInputVariableSet(set.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove Set
                  </button>
                )}
              </div>

              {set.variables.map((variable, variableIndex) => (
                <div key={variableIndex} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={variable.key}
                    onChange={(e) => updateVariable(set.id, variableIndex, 'key', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Variable key"
                  />
                  <input
                    type="text"
                    value={variable.value}
                    onChange={(e) => updateVariable(set.id, variableIndex, 'value', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Variable value"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariableFromSet(set.id, variableIndex)}
                    className="px-3 py-2 text-red-500 hover:text-red-700"
                    disabled={set.variables.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addVariableToSet(set.id)}
                className="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Add Variable
              </button>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Uploading...' : 'Upload Collection'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CollectionUploader;