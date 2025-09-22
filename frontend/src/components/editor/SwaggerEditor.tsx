import React, { useRef, useCallback, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import YAML from 'yaml';
import { SwaggerToJSONConverter } from '../../lib/converters/swagger-to-json';
import type { NormalizedAPI } from '../../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface SwaggerEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  onValidate?: (errors: any[]) => void;
  onConvert?: (api: NormalizedAPI | null) => void;
  height?: string;
}

export const SwaggerEditor: React.FC<SwaggerEditorProps> = ({
  initialValue = `openapi: 3.0.0
info:
  title: Sample API
  version: 1.0.0
paths:
  /hello:
    get:
      summary: Returns a greeting
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string`,
  onChange,
  onValidate,
  onConvert,
  height = '100%',
}) => {
  const [value, setValue] = useState(initialValue);
  const [errors, setErrors] = useState<any[]>([]);
  const [isValid, setIsValid] = useState(true);
  const converter = useRef(new SwaggerToJSONConverter());
  const editorRef = useRef<any>(null);

  const validateAndConvert = useCallback((content: string) => {
    try {
      // Try to parse YAML/JSON
      let parsed;
      try {
        parsed = YAML.parse(content);
      } catch {
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          const error = {
            message: 'Invalid YAML/JSON syntax',
            line: 1,
          };
          setErrors([error]);
          setIsValid(false);
          if (onValidate) onValidate([error]);
          if (onConvert) onConvert(null);
          return;
        }
      }

      // Basic validation
      const validationErrors: any[] = [];

      if (!parsed.openapi && !parsed.swagger) {
        validationErrors.push({
          message: 'Missing openapi or swagger version',
          line: 1,
        });
      }

      if (!parsed.info) {
        validationErrors.push({
          message: 'Missing info section',
          line: 1,
        });
      } else {
        if (!parsed.info.title) {
          validationErrors.push({
            message: 'Missing info.title',
            line: 1,
          });
        }
        if (!parsed.info.version) {
          validationErrors.push({
            message: 'Missing info.version',
            line: 1,
          });
        }
      }

      if (!parsed.paths) {
        validationErrors.push({
          message: 'Missing paths section',
          line: 1,
        });
      }

      setErrors(validationErrors);
      setIsValid(validationErrors.length === 0);

      if (onValidate) {
        onValidate(validationErrors);
      }

      // Convert to normalized format
      if (validationErrors.length === 0) {
        const result = converter.current.convert(content);
        if (result.success && onConvert) {
          onConvert(result.data || null);
        }
      } else if (onConvert) {
        onConvert(null);
      }
    } catch (error) {
      const err = {
        message: error instanceof Error ? error.message : 'Unknown error',
        line: 1,
      };
      setErrors([err]);
      setIsValid(false);
      if (onValidate) onValidate([err]);
      if (onConvert) onConvert(null);
    }
  }, [onValidate, onConvert]);

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    const val = newValue || '';
    setValue(val);

    // Debounce validation
    const timeoutId = setTimeout(() => {
      validateAndConvert(val);
    }, 500);

    if (onChange) {
      onChange(val);
    }

    return () => clearTimeout(timeoutId);
  }, [onChange, validateAndConvert]);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;

    // Register YAML language if not already registered
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'yaml')) {
      monaco.languages.register({ id: 'yaml' });
    }

    // Set up OpenAPI/Swagger snippets
    monaco.languages.registerCompletionItemProvider('yaml', {
      provideCompletionItems: () => {
        const suggestions = [
          {
            label: 'openapi',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'openapi: "3.0.0"',
            documentation: 'OpenAPI version declaration',
          },
          {
            label: 'info',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `info:
  title: \${1:API Title}
  version: \${2:1.0.0}
  description: \${3:API Description}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'API information block',
          },
          {
            label: 'paths',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `paths:
  /\${1:endpoint}:
    \${2:get}:
      summary: \${3:Endpoint summary}
      responses:
        '200':
          description: \${4:Success response}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'API paths block',
          },
          {
            label: 'components',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `components:
  schemas:
    \${1:ModelName}:
      type: object
      properties:
        \${2:property}:
          type: \${3:string}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Components block for reusable schemas',
          },
        ];

        return { suggestions };
      },
    });

    // Initial validation
    validateAndConvert(value);
  }, [value, validateAndConvert]);

  useEffect(() => {
    validateAndConvert(value);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Swagger Editor</span>
          {isValid ? (
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.length} {errors.length === 1 ? 'error' : 'errors'}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          YAML | OpenAPI 3.0
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height={height}
          defaultLanguage="yaml"
          language="yaml"
          theme="vs-dark"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            parameterHints: {
              enabled: true,
            },
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 2,
          }}
        />
      </div>

      {/* Error Panel */}
      {errors.length > 0 && (
        <div className="max-h-32 overflow-y-auto bg-red-900 border-t border-red-800">
          <div className="p-2 space-y-1">
            {errors.map((error, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-red-300"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {error.line && `Line ${error.line}: `}
                  {error.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};