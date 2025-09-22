import { useState } from 'react';
import { SwaggerEditor } from './components/editor/SwaggerEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { FileJson, Code2, Copy, Download, Upload } from 'lucide-react';
import type { NormalizedAPI } from './types';
import './App.css';

function App() {
  const [convertedAPI, setConvertedAPI] = useState<NormalizedAPI | null>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'editor' | 'json'>('editor');

  const handleCopyJSON = () => {
    if (convertedAPI) {
      navigator.clipboard.writeText(JSON.stringify(convertedAPI, null, 2));
    }
  };

  const handleDownloadJSON = () => {
    if (convertedAPI) {
      const blob = new Blob([JSON.stringify(convertedAPI, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'swagger-normalized.json';
      a.click();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Code2 className="w-8 h-8 text-slate-700" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Swagger Editor</h1>
              <p className="text-sm text-slate-600">Convert OpenAPI/Swagger to normalized JSON</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full flex gap-6">
          {/* Editor Panel */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">OpenAPI/Swagger Editor</CardTitle>
                  <CardDescription>Write or paste your API specification</CardDescription>
                </div>
                {errors.length > 0 && (
                  <div className="text-sm text-red-600 font-medium">
                    {errors.length} validation {errors.length === 1 ? 'error' : 'errors'}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <div className="h-full border-t">
                <SwaggerEditor
                  onValidate={setErrors}
                  onConvert={setConvertedAPI}
                  height="100%"
                />
              </div>
            </CardContent>
          </Card>

          {/* Output Panel */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Normalized JSON Output</CardTitle>
                  <CardDescription>Structured format for database storage</CardDescription>
                </div>
                {convertedAPI && (
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" onClick={handleCopyJSON}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownloadJSON}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'editor' | 'json')} className="h-full flex flex-col">
                <TabsList className="mx-4 mb-2">
                  <TabsTrigger value="editor" className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    JSON View
                  </TabsTrigger>
                  <TabsTrigger value="json" className="flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    Raw JSON
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="editor" className="flex-1 overflow-auto m-0">
                  <div className="p-4 bg-slate-900 h-full">
                    {convertedAPI ? (
                      <pre className="text-xs text-emerald-400 font-mono">{JSON.stringify(convertedAPI, null, 2)}</pre>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <FileJson className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400 text-sm">
                            {errors.length > 0
                              ? 'Fix validation errors to see JSON output'
                              : 'Enter valid Swagger/OpenAPI to see normalized JSON'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="json" className="flex-1 overflow-auto m-0">
                  <div className="p-4 bg-slate-50 h-full">
                    {convertedAPI ? (
                      <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap">{JSON.stringify(convertedAPI, null, 2)}</pre>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-slate-500 text-sm">No data to display</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;