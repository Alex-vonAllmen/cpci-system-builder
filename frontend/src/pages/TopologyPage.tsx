import { useConfigStore } from '../store/configStore';
import { BackplaneVisualizer } from '../components/BackplaneVisualizer';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TopologyPage() {
    const { slotCount, systemSlotPosition, setSlotCount, setSystemSlotPosition } = useConfigStore();

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Configure Backplane Topology</h1>
                <p className="text-slate-500 max-w-2xl mx-auto">
                    Define the physical layout of your CompactPCI Serial system. Choose the number of slots and the position of the system slot.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                        <h2 className="text-lg font-semibold text-slate-900">Settings</h2>

                        {/* Slot Count Slider */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700">
                                Number of Slots: <span className="font-bold text-duagon-blue">{slotCount}</span>
                            </label>
                            <input
                                type="range"
                                min="2"
                                max="21"
                                step="1"
                                value={slotCount}
                                onChange={(e) => setSlotCount(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-duagon-blue"
                            />
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>2</span>
                                <span>21</span>
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
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${systemSlotPosition === 'left'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Left
                                </button>
                                <button
                                    onClick={() => setSystemSlotPosition('right')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${systemSlotPosition === 'right'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
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
        </div>
    );
}
