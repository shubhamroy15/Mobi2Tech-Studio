import React, { useState, useCallback } from 'react';
import { ProductStudioIcon, EditIcon, GenerateIcon, StyleCopyIcon } from './components/Icons';
import ProductStudio from './components/ProductStudio';
import ImageEditor from './components/ImageEditor';
import ImageGenerator from './components/ImageGenerator';
import StyleCopier from './components/StyleCopier';
import { Tab } from './types';

const TABS: { id: Tab; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'studio', label: 'Product Studio', icon: ProductStudioIcon },
  { id: 'copier', label: 'Style Copy', icon: StyleCopyIcon },
  { id: 'editor', label: 'Image Editor', icon: EditIcon },
  { id: 'generator', label: 'Image Generator', icon: GenerateIcon },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('studio');

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'studio':
        return <ProductStudio />;
      case 'copier':
        return <StyleCopier />;
      case 'editor':
        return <ImageEditor />;
      case 'generator':
        return <ImageGenerator />;
      default:
        return null;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 shadow-lg sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-white tracking-wider">
              Mobi2Tech Studio
            </h1>
            <nav className="hidden md:flex items-center space-x-2 bg-gray-900 p-1 rounded-lg">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>
      <nav className="md:hidden bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 fixed bottom-0 left-0 right-0 z-20">
          <div className="flex justify-around">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center space-y-1 py-2 px-3 text-xs w-full font-medium transition-colors duration-200 ${
                  activeTab === tab.id ? 'text-indigo-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-6 h-6" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
      </nav>
    </div>
  );
};

export default App;