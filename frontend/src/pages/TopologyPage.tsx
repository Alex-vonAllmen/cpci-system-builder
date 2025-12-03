import { useEffect } from 'react';
import { useConfigStore } from '../store/configStore';
import { BackplaneVisualizer } from '../components/BackplaneVisualizer';
import { ArrowRight, Box, LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export function TopologyPage() {
    const {
        slotCount, systemSlotPosition, setSlotCount, setSystemSlotPosition,
        examples, fetchExamples, importConfig
    } = useConfigStore();

    useEffect(() => {
        fetchExamples();
    }, []);

    console.log("Examples:", examples);

    const handleSelectExample = (configJson: string) => {
        try {
            const config = JSON.parse(configJson);
            importConfig(config);
        } catch (e) {
            console.error("Failed to parse example config", e);
        }
    };

    return (
        <div className="space-y-12">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Configure Backplane Topology</h1>
                <p className="text-slate-500 max-w-2xl mx-auto">
                    Start with an example configuration or define your custom layout below.
                </p>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                        <h2 className="text-lg font-semibold text-slate-900">Custom Settings</h2>

                        {/* Rack Size Selection */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700">
                                Rack Size
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSlotCount(10)}
                                    className={cn(
                                        "py-3 px-4 rounded-lg text-sm font-medium border transition-all flex flex-col items-center gap-1",
                                        slotCount === 10
                                            ? "bg-blue-50 border-duagon-blue text-duagon-blue"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                    )}
                                >
                                    <span className="font-bold">Half 19"</span>
                                    <span className="text-xs opacity-75">10 Slots (40HP / ~20.3cm)</span>
                                </button>
                                <button
                                    onClick={() => setSlotCount(21)}
                                    className={cn(
                                        "py-3 px-4 rounded-lg text-sm font-medium border transition-all flex flex-col items-center gap-1",
                                        slotCount === 21
                                            ? "bg-blue-50 border-duagon-blue text-duagon-blue"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                    )}
                                >
                                    <span className="font-bold">Full 19"</span>
                                    <span className="text-xs opacity-75">21 Slots (84HP / ~42.7cm)</span>
                                </button>
                            </div>
                        </div>

                        {/* System Slot Position Toggle */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700">
                                System Slot Position
                            </label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setSystemSlotPosition('left')}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                                        systemSlotPosition === 'left'
                                            ? "bg-white text-duagon-blue shadow-sm font-bold"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Left
                                </button>
                                <button
                                    onClick={() => setSystemSlotPosition('right')}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                                        systemSlotPosition === 'right'
                                            ? "bg-white text-duagon-blue shadow-sm font-bold"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Right
                                </button>
                            </div>
                        </div>
                    </div>



                    {/* Next Step Action */}
                    <div className="flex justify-end">
                        <Link
                            to="/components"
                            className="inline-flex items-center justify-center gap-2 bg-duagon-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-duagon-blue/90 transition-colors w-full lg:w-auto"
                        >
                            Next: Select Components
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                {/* Visualizer */}
                <div className="lg:col-span-2">
                    <BackplaneVisualizer />
                    <div className="mt-4 flex justify-center gap-6 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>System Slot</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span>Peripheral Slot</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Example Configurations */}
            {examples.length > 0 && (
                <div className="space-y-6 pt-8 border-t border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <LayoutTemplate className="text-duagon-blue" />
                        Example Configurations
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {examples.map(example => (
                            <button
                                key={example.id}
                                onClick={() => handleSelectExample(example.config_json)}
                                className="group text-left bg-white rounded-xl shadow-sm border border-slate-200 hover:border-duagon-blue hover:shadow-md transition-all overflow-hidden flex flex-col h-full"
                            >
                                {example.image_url ? (
                                    <div className="h-40 bg-slate-100 overflow-hidden w-full">
                                        <img src={example.image_url} alt={example.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                ) : (
                                    <div className="h-40 bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50/50 transition-colors w-full">
                                        <Box size={48} />
                                    </div>
                                )}
                                <div className="p-4 space-y-2 flex-1">
                                    <h3 className="font-bold text-slate-900 group-hover:text-duagon-blue transition-colors">{example.name}</h3>
                                    <p className="text-sm text-slate-500">{example.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div >
    );
}
