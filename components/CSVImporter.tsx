import React, { useState } from 'react';
import { Upload, ArrowRight, Check, X, FileText, AlertCircle } from 'lucide-react';
import { parseCSV, CSVParseResult } from '../services/scryfallService';

interface CSVImporterProps {
  onClose: () => void;
  onImport: (mappedData: any[]) => void;
}

const REQUIRED_FIELDS = [
  { 
    key: 'name', 
    label: 'Card Name', 
    required: true,
    aliases: ['name', 'card name', 'card', 'english_name', 'title']
  },
  { 
    key: 'set', 
    label: 'Set Code', 
    required: false,
    aliases: ['set', 'set code', 'edition', 'expansion', 'set_code', 'code']
  },
  { 
    key: 'collectorNumber', 
    label: 'Collector Number', 
    required: false,
    aliases: ['collector number', 'collector_number', 'cn', 'number', 'collector #', '#', 'card number']
  },
  { 
    key: 'condition', 
    label: 'Condition', 
    required: false,
    aliases: ['condition', 'quality', 'grade', 'cond']
  },
  { 
    key: 'isFoil', 
    label: 'Is Foil?', 
    required: false,
    aliases: ['is foil', 'foil', 'finish', 'is_foil', 'printing'] 
  },
];

const CSVImporter: React.FC<CSVImporterProps> = ({ onClose, onImport }) => {
  const [step, setStep] = useState<'upload' | 'map'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      try {
        const result = await parseCSV(selectedFile);
        setParsedData(result);
        
        // Auto-detect mapping
        const initialMapping: Record<string, string> = {};
        
        REQUIRED_FIELDS.forEach(field => {
            const possibleMatches = [field.key, field.label, ...(field.aliases || [])].map(s => s.toLowerCase());
            
            // 1. Exact match against aliases
            let match = result.headers.find(h => possibleMatches.includes(h.toLowerCase()));
            
            // 2. Partial match (if no exact match found, e.g. "Card Name (English)" contains "Card Name")
            if (!match) {
                 match = result.headers.find(h => possibleMatches.some(pm => h.toLowerCase().includes(pm)));
            }
            
            if (match) initialMapping[field.key] = match;
        });

        setMapping(initialMapping);
        setStep('map');
      } catch (err) {
        console.error("CSV Parse error", err);
        alert("Failed to parse CSV");
      }
    }
  };

  const handleImportClick = () => {
    if (!parsedData) return;
    
    // Transform rows based on mapping
    const mappedRows = parsedData.rows.map(row => {
        const mappedItem: any = {};
        Object.entries(mapping).forEach(([targetKey, sourceHeader]) => {
            if (sourceHeader) {
                mappedItem[targetKey] = row[sourceHeader as string];
            }
        });
        return mappedItem;
    });

    onImport(mappedRows);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="text-violet-500" />
            Bulk Import Cards
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {step === 'upload' && (
            <div className="text-center py-10 border-2 border-dashed border-slate-700 rounded-xl hover:border-violet-500 hover:bg-slate-800/30 transition-all cursor-pointer relative">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                    <FileText size={32} />
                </div>
                <div>
                    <p className="text-lg font-medium text-white">Click to upload CSV</p>
                    <p className="text-sm text-slate-400">or drag and drop file here</p>
                </div>
              </div>
            </div>
          )}

          {step === 'map' && parsedData && (
            <div className="space-y-6">
                <div className="bg-slate-800/50 p-4 rounded-lg flex gap-3 items-start border border-slate-700">
                    <AlertCircle className="text-violet-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-slate-300">
                        Map the columns from your CSV to the card properties. Mapping <b>Set Code</b> and <b>Collector Number</b> ensures we import the exact version of your card.
                    </p>
                </div>

                <div className="grid gap-4">
                    {REQUIRED_FIELDS.map(field => (
                        <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 md:gap-4 p-3 rounded hover:bg-slate-800/30">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
                                {field.label}
                                {field.required && <span className="text-red-400">*</span>}
                            </label>
                            <ArrowRight className="hidden md:block text-slate-600 justify-self-center" size={16} />
                            <select
                                value={mapping[field.key] || ''}
                                onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                <option value="">-- Select Column --</option>
                                {parsedData.headers.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>

                <div className="mt-4">
                    <h4 className="text-sm font-bold text-white mb-2">Preview (First 3 rows)</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-400">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    {Object.keys(mapping).map(k => (
                                        <th key={k} className="p-2 text-violet-400 font-medium">{REQUIRED_FIELDS.find(f => f.key === k)?.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.rows.slice(0, 3).map((row, i) => (
                                    <tr key={i} className="border-b border-slate-800/50">
                                        {Object.entries(mapping).map(([target, source]) => (
                                            <td key={target} className="p-2">{row[source as string] || '-'}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
          {step === 'map' && (
             <>
                <button onClick={() => setStep('upload')} className="px-4 py-2 text-slate-400 hover:text-white">
                    Back
                </button>
                <button 
                    onClick={handleImportClick}
                    disabled={!mapping['name']}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                    <Check size={18} /> Import Cards
                </button>
             </>
          )}
          {step === 'upload' && (
              <button onClick={onClose} className="text-slate-400 hover:text-white px-4">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImporter;