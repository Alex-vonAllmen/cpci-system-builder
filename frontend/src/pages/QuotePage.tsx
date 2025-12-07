import { useState, useEffect, useRef } from 'react';
import { useConfigStore } from '../store/configStore';

import { type Product } from '../data/mockProducts';
import { ArrowLeft, Send, FileText, CheckCircle, Download, Cable, Server } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

import { useToast } from '../components/ui/Toast';
import { BackplaneVisualizer } from '../components/BackplaneVisualizer';

export function QuotePage() {
    const { slots, chassisId, chassisOptions, psuId, psuOptions, products, articles, fetchProducts, resetConfig } = useConfigStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (products.length === 0) fetchProducts();
    }, []);

    const handleStartNew = () => {
        resetConfig();
        navigate('/');
    };

    const scrollToForm = () => {
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Helper to find match article
    const findMatchingArticle = (productId: string, options: Record<string, any>) => {
        return articles?.find((a: any) => {
            if (a.product_id !== productId) return false;

            const articleOptions = a.selected_options || {};
            const itemOptions = options || {};

            const articleKeys = Object.keys(articleOptions);
            const itemKeys = Object.keys(itemOptions);

            // Check 1: All requirements in matched article must be present in item
            const articleRequirementsMet = articleKeys.every(key => {
                const requiredValue = articleOptions[key];
                const actualValue = itemOptions[key];

                // Special handling for booleans: missing key implies false
                if (requiredValue === false) {
                    return actualValue === false || actualValue === undefined || actualValue === null;
                }

                // Strict equality for others
                return requiredValue === actualValue;
            });

            if (!articleRequirementsMet) return false;

            // Check 2: Item shouldn't have extra "truthy" options not in article
            const noExtraRequirements = itemKeys.every(key => {
                if (Object.prototype.hasOwnProperty.call(articleOptions, key)) return true;
                const val = itemOptions[key];
                return val === false || val === undefined || val === null || val === '';
            });

            return noExtraRequirements;
        });
    };

    // Form State
    const [formData, setFormData] = useState({
        prototypeQty: '',
        prototypeDate: '',
        seriesQty: '',
        seriesDate: '',
        company: '',
        department: '',
        position: '',
        title: '',
        firstName: '',
        lastName: '',
        street: '',
        zip: '',
        city: '',
        country: '',
        phone: '',
        email: '',
    });

    // --- 1. Gather all selected items ---
    // We will separate them conceptually first to control sort order:
    // Order: Slots (1..N) -> Chassis -> Backplane -> PSU

    interface ConfigItem {
        product: Product;
        options: Record<string, any>;
        slotLabel: string;
        sortOrder: number; // custom sort key
        type: 'slot' | 'chassis' | 'backplane' | 'psu';
        slotId?: number;
    }

    const configItems: ConfigItem[] = [];

    // Slots (Components & Fillers)
    const fillerProduct = products.find((p: any) => p.id === 'FILLER_4HP');
    const sortedSlots = [...slots].sort((a, b) => a.id - b.id);

    sortedSlots.forEach(slot => {
        if (slot.blockedBy) return; // Skip blocked

        if (slot.componentId) {
            const p = products.find((p: any) => p.id === slot.componentId);
            if (p) {
                configItems.push({
                    product: p,
                    options: slot.selectedOptions || {},
                    slotLabel: slot.type === 'psu' ? `Slot ${slot.id}` : slot.id.toString(),
                    sortOrder: slot.id,
                    type: 'slot',
                    slotId: slot.id
                });
            }
        } else if (slot.type === 'peripheral' && fillerProduct) {
            configItems.push({
                product: fillerProduct,
                options: {},
                slotLabel: slot.id.toString(),
                sortOrder: slot.id,
                type: 'slot',
                slotId: slot.id
            });
        }
    });

    // Chassis
    if (chassisId) {
        const p = products.find((p: any) => p.id === chassisId);
        if (p) {
            configItems.push({
                product: p,
                options: chassisOptions || {},
                slotLabel: '', // No ID for chassis
                sortOrder: 1000,
                type: 'chassis'
            });
        }
    }

    // Backplane Logic
    const backplaneConnectors: Record<string, string[]> = {};
    sortedSlots.forEach(slot => {
        if (slot.type === 'psu') return;
        let connectors: string[] = ['P1'];
        if (slot.componentId) {
            const p = products.find((p: any) => p.id === slot.componentId);
            if (p && p.connectors && p.connectors.length > 0) {
                connectors = p.connectors;
            }
        }
        if (!connectors.includes('P1')) connectors.push('P1');
        backplaneConnectors[`Slot ${slot.id}`] = connectors.sort();
    });

    configItems.push({
        product: {
            id: 'BACKPLANE_CFG',
            type: 'backplane',
            name: 'Custom Backplane Configuration',
            description: 'Backplane configured with specific connectors per slot.',
            powerWatts: 0,
            widthHp: 0,
            price1: 0,
            price25: 0,
            price50: 0,
            price100: 0,
            price250: 0,
            price500: 0,
            connectors: [],
        } as any,
        options: backplaneConnectors,
        slotLabel: '', // No ID for Backplane
        sortOrder: 1001,
        type: 'backplane'
    });

    // PSU (Non-pluggable)
    if (psuId) {
        const isPluggable = slots.some(s => s.type === 'psu' && s.componentId === psuId);
        if (!isPluggable) {
            const p = products.find((p: any) => p.id === psuId);
            if (p) {
                configItems.push({
                    product: p,
                    options: psuOptions || {},
                    slotLabel: '', // No ID for PSU
                    sortOrder: 1002,
                    type: 'psu'
                });
            }
        }
    }

    // Final Sort
    const selectedItems = configItems.sort((a, b) => a.sortOrder - b.sortOrder);

    // --- 2. Calculate Prices ---
    const getPriceForQuantity = (product: any, qty: number) => {
        if (!product) return 0;
        if (qty >= 500) return product.price500 || product.price1;
        if (qty >= 250) return product.price250 || product.price1;
        if (qty >= 100) return product.price100 || product.price1;
        if (qty >= 50) return product.price50 || product.price1;
        if (qty >= 25) return product.price25 || product.price1;
        return product.price1 || 0;
    };

    const getOptionPrice = (priceMod: number | Record<string, number>, qty: number) => {
        if (typeof priceMod === 'number') return priceMod;
        if (!priceMod) return 0;

        if (qty >= 500) return priceMod['500'] || priceMod['1'] || 0;
        if (qty >= 250) return priceMod['250'] || priceMod['1'] || 0;
        if (qty >= 100) return priceMod['100'] || priceMod['1'] || 0;
        if (qty >= 50) return priceMod['50'] || priceMod['1'] || 0;
        if (qty >= 25) return priceMod['25'] || priceMod['1'] || 0;
        return priceMod['1'] || 0;
    };

    const prototypeQtyNum = Number(formData.prototypeQty) || 0;
    const seriesQtyNum = Number(formData.seriesQty) || 0;

    // Helper to calc unit price for one item
    const calcItemUnitPrice = (item: ConfigItem, qty: number) => {
        const basePrice = getPriceForQuantity(item.product, qty);
        let optPrice = 0;
        if (item.product.options) {
            Object.entries(item.options).forEach(([optId, optVal]) => {
                const optDef = (item.product.options as any[]).find((o: any) => o.id === optId);
                if (optDef) {
                    if (optDef.type === 'select') {
                        const choice = optDef.choices.find((c: any) => c.value === optVal);
                        if (choice) optPrice += getOptionPrice(choice.priceMod, qty);
                    } else if (optDef.type === 'boolean' && optVal === true) {
                        optPrice += getOptionPrice(optDef.priceMod, qty);
                    }
                }
            });
        }
        return basePrice + optPrice;
    };

    const prototypeSystemUnitPrice = selectedItems.reduce((sum, item) => sum + calcItemUnitPrice(item, prototypeQtyNum), 0);
    const seriesSystemUnitPrice = selectedItems.reduce((sum, item) => sum + calcItemUnitPrice(item, seriesQtyNum), 0);

    const prototypeGrandTotal = prototypeSystemUnitPrice * (prototypeQtyNum || 1);
    const seriesGrandTotal = seriesSystemUnitPrice * seriesQtyNum;
    const totalCost = prototypeGrandTotal + seriesGrandTotal;

    // --- 3. Power Consumption ---
    const powerConsumption = selectedItems.reduce((sum, item) => {
        if (item.product.type === 'psu') return sum;
        let watts = item.product.powerWatts || 0;
        if (item.product.options && item.options) {
            Object.entries(item.options).forEach(([optId, optVal]) => {
                const optDef = (item.product.options as any[]).find((o: any) => o.id === optId);
                if (optDef) {
                    if (optDef.type === 'select') {
                        const choice = optDef.choices.find((c: any) => c.value === optVal);
                        if (choice && choice.powerMod) watts += choice.powerMod;
                    } else if (optDef.type === 'boolean' && optVal === true) {
                        if (optDef.powerMod) watts += optDef.powerMod;
                    }
                }
            });
        }
        return watts > 0 ? sum + watts : sum;
    }, 0);

    const powerCapacity = selectedItems.reduce((sum, item) => {
        const watts = item.product.powerWatts || 0;
        return watts < 0 ? sum + Math.abs(watts) : sum;
    }, 0);

    const isPowerOverload = powerCapacity > 0 && powerConsumption > powerCapacity;

    // --- 4. Interfaces ---
    const aggregatedInterfaces: Record<string, { type: string, connector: string, count: number }> = {};
    selectedItems.forEach(item => {
        if (item.product.externalInterfaces) {
            item.product.externalInterfaces.forEach(iface => {
                const key = `${iface.type}-${iface.connector}`;
                if (!aggregatedInterfaces[key]) aggregatedInterfaces[key] = { ...iface, count: 0 };
                aggregatedInterfaces[key].count += iface.count;
            });
        }
        if (item.product.options && item.options) {
            Object.entries(item.options).forEach(([optId, optVal]) => {
                const optDef = (item.product.options as any[]).find((o: any) => o.id === optId);
                if (optDef) {
                    let modInterfaces = null;
                    if (optDef.type === 'select') {
                        const choice = optDef.choices.find((c: any) => c.value === optVal);
                        if (choice && choice.externalInterfacesMod) modInterfaces = choice.externalInterfacesMod;
                    } else if (optDef.type === 'boolean' && optVal === true) {
                        if (optDef.externalInterfacesMod) modInterfaces = optDef.externalInterfacesMod;
                    }
                    if (modInterfaces) {
                        modInterfaces.forEach((iface: any) => {
                            const key = `${iface.type}-${iface.connector}`;
                            if (!aggregatedInterfaces[key]) aggregatedInterfaces[key] = { ...iface, count: 0 };
                            aggregatedInterfaces[key].count += iface.count;
                        });
                    }
                }
            });
        }
    });

    const sortedInterfaces = Object.values(aggregatedInterfaces).sort((a, b) => a.type.localeCompare(b.type));

    // --- PDF / Submit Handlers ---
    const generatePDF = async (returnBlob = false) => {
        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("System Quotation", 14, 22);
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableData = selectedItems.map(item => {
            const unitTotal = calcItemUnitPrice(item, prototypeQtyNum);
            let connectorsStr = item.product.type === 'backplane' ? 'See Config' : (item.product.connectors || []).join(', ');
            const article = findMatchingArticle(item.product.id, item.options);
            const partNumber = article ? article.article_number : item.product.id;
            const description = article ? `${item.product.name} (Article Match)` : item.product.name;

            return [
                item.slotLabel,
                partNumber,
                description,
                connectorsStr,
                item.product.type === 'backplane' ? '-' : `${item.product.widthHp}HP`,
                item.product.type,
                `€${unitTotal.toLocaleString()}`
            ];
        });

        autoTable(doc, {
            head: [['Slot', 'Part Number', 'Description', 'Connectors', 'Width', 'Type', 'Unit Price']],
            body: tableData,
            startY: 40,
            styles: { fontSize: 8 },
            columnStyles: { 2: { cellWidth: 40 }, 3: { cellWidth: 20 } }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.text(`System Unit Price (Prototype): €${prototypeSystemUnitPrice.toLocaleString()}`, 14, finalY);
        doc.text(`System Unit Price (Series): €${seriesSystemUnitPrice.toLocaleString()}`, 14, finalY + 5);
        doc.text(`Total Estimated Cost: €${totalCost.toLocaleString()}`, 14, finalY + 15);

        if (returnBlob) return doc.output('datauristring');
        else doc.save("quotation.pdf");
    };

    const handleDownloadPDF = () => generatePDF(false);

    const checkFormValidity = () => {
        // Basic check for required fields
        const required = ['company', 'position', 'title', 'firstName', 'lastName', 'street', 'zip', 'city', 'country', 'phone', 'email'];
        const missing = required.filter(f => !formData[f as keyof typeof formData]);
        return missing.length === 0;
    };

    const handleRequestQuote = () => {
        if (!checkFormValidity()) {
            scrollToForm();
            toast.error("Please fill in all required fields in the Project Details section.");
        } else {
            // If valid, we can submit directly or scroll to button to encourage submit.
            // Since the submit logic is in the form handler, let's just scroll to form and focus submit?
            // Or better, trigger the submit logic if we had a ref to the form submission.
            // For now, let's scroll and focus.
            scrollToForm();
            // Ideally we would trigger submit if valid, but user might want to review fields.
            // So we scroll to the bottom submit button.
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { api } = await import('../services/api');
            const pdfBase64 = await generatePDF(true);

            const bomData = selectedItems.map(item => {
                const article = findMatchingArticle(item.product.id, item.options);
                return {
                    slot: item.slotLabel,
                    component: item.product.name,
                    partNumber: article ? article.article_number : item.product.id,
                    isArticle: !!article,
                    connectors: item.product.connectors || [],
                    options: item.options
                };
            });
            const jsonBase64 = "data:application/json;base64," + btoa(JSON.stringify(bomData, null, 2));

            const payload = {
                user: formData,
                config: { slots, chassisId, psuId },
                items: selectedItems.map(item => ({
                    slotLabel: item.slotLabel,
                    product: { id: item.product.id, name: item.product.name, type: item.product.type },
                    articleNumber: findMatchingArticle(item.product.id, item.options)?.article_number,
                    options: item.options
                })),
                totalCost: totalCost,
                pdf_base64: pdfBase64,
                json_base64: jsonBase64
            };

            await api.config.requestQuote(payload);
            setIsSuccess(true);
        } catch (error) {
            console.error("Failed to submit quote:", error);
            toast.error("Failed to submit quote. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={40} />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Quote Requested!</h1>
                <p className="text-slate-500 max-w-md">Thank you, {formData.firstName}. We will send a quote to <strong>{formData.email}</strong> shortly.</p>
                <button onClick={handleStartNew} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors">Start New Configuration</button>
            </div>
        );
    }

    const handleDownloadJSON = () => {
        const fullConfig = {
            slotCount: slots.length,
            systemSlotPosition: useConfigStore.getState().systemSlotPosition,
            chassisId, chassisOptions, psuId, psuOptions,
            slots: slots.map(s => ({ id: s.id, type: s.type, componentId: s.componentId, selectedOptions: s.selectedOptions, width: s.width, blockedBy: s.blockedBy }))
        };
        const exportData = {
            bom: selectedItems.map(item => ({
                slot: item.slotLabel,
                component: item.product.name,
                partNumber: findMatchingArticle(item.product.id, item.options)?.article_number,
                options: item.options
            })),
            config: fullConfig
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "system_configuration.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="space-y-8">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Review & Quote</h1>
                    <p className="text-slate-500">Review your configuration and request a quote.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <Link to="/chassis" className="inline-flex items-center gap-2 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors">
                        <ArrowLeft size={18} /> Back
                    </Link>
                    <button
                        onClick={handleRequestQuote}
                        className="inline-flex items-center gap-2 bg-duagon-blue text-white px-5 py-2.5 rounded-lg font-bold hover:bg-duagon-blue/90 transition-colors shadow-sm"
                    >
                        <Send size={18} /> Request Quote
                    </button>
                </div>
            </div>

            {/* Top Section using Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Topology Visualizer */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Server size={20} className="text-slate-400" />
                            System Topology
                        </h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center">
                        <BackplaneVisualizer />
                    </div>
                </div>

                {/* Right: External Interface Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Cable size={20} className="text-slate-400" />
                            External Interface Summary
                        </h2>
                    </div>
                    <div className="p-6">
                        {sortedInterfaces.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {sortedInterfaces.map((iface, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div>
                                            <div className="font-semibold text-slate-900">{iface.type}</div>
                                            <div className="text-xs text-slate-500">{iface.connector}</div>
                                        </div>
                                        <div className="text-xl font-bold text-slate-700">{iface.count}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 py-8">No external interfaces found.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* BOM Section - Full Width */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <FileText size={20} className="text-slate-400" />
                        Bill of Materials
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadJSON} className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50">
                            <Download size={16} /> JSON
                        </button>
                        <button onClick={handleDownloadPDF} className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50">
                            <FileText size={16} /> PDF
                        </button>
                    </div>
                </div>

                <div className="p-0">
                    {selectedItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No components selected.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {/* BOM Header Row ?? Maybe just list items cleanly */}
                            <div className="bg-slate-50/50 px-6 py-2 text-xs font-semibold text-slate-500 flex gap-4 uppercase tracking-wider">
                                <span className="w-16">Slot</span>
                                <span className="flex-1">Description / Part Number</span>
                                <span className="w-32 text-right">Price (Series)</span>
                            </div>

                            {selectedItems.map((item, idx) => {
                                const unitPriceProto = calcItemUnitPrice(item, prototypeQtyNum);
                                const unitPriceSeries = calcItemUnitPrice(item, seriesQtyNum);
                                const article = findMatchingArticle(item.product.id, item.options);
                                const displayArticleNumber = article ? article.article_number : `${item.product.id}-xx`;

                                return (
                                    <div key={idx} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            {/* Slot Area */}
                                            <div className="w-16 pt-1">
                                                {item.slotLabel && (
                                                    <span className="text-slate-500 font-medium text-sm">
                                                        {item.slotLabel}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Details Area */}
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Top Row: Name & PN */}
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{item.product.name}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <code className="text-xs text-duagon-blue bg-blue-50 px-1.5 py-0.5 rounded">{displayArticleNumber}</code>
                                                        {article && <span className="text-[10px] text-green-600 flex items-center gap-1 font-medium"><CheckCircle size={10} /> Matched</span>}
                                                    </div>
                                                </div>
                                                {/* Options / Proto Price hint */}
                                                <div className="text-xs text-slate-500 md:text-right md:pr-4">
                                                    Part No: {item.product.id}
                                                    <div className="mt-1">Proto Unit: €{unitPriceProto.toLocaleString()}</div>
                                                </div>
                                            </div>

                                            {/* Price Area */}
                                            <div className="w-32 text-right">
                                                <div className="text-sm font-bold text-slate-700">€{unitPriceSeries.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Totals Section */}
                    <div className="bg-slate-50 border-t border-slate-200 p-6 space-y-4">
                        {/* System Unit Prices */}
                        <div className="flex flex-col md:flex-row gap-8 justify-end border-b border-slate-200 pb-4">
                            <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">System Unit Price (Prototype)</div>
                                <div className="text-xl font-semibold text-slate-700">€{prototypeSystemUnitPrice.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">System Unit Price (Series)</div>
                                <div className="text-xl font-bold text-duagon-blue">€{seriesSystemUnitPrice.toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Grand Totals */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                            <div>
                                {/* Power / EOL Summary */}
                                <div className="flex justify-between text-sm text-slate-600 mb-1">
                                    <span>Total Power Consumption</span>
                                    <span className={cn(isPowerOverload ? "text-red-600 font-bold" : "")}>
                                        {powerConsumption}W / {powerCapacity > 0 ? `${powerCapacity}W` : 'External'}
                                    </span>
                                </div>
                                {isPowerOverload && <p className="text-xs text-red-600">Warning: Power overload!</p>}
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Prototype Total ({prototypeQtyNum || 1} units)</span>
                                    <span className="font-medium">€{prototypeGrandTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Series Total ({seriesQtyNum} units)</span>
                                    <span className="font-bold text-duagon-blue">€{seriesGrandTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                                    <span>Estimated Total</span>
                                    <span>€{totalCost.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Project Details Form */}
            <div ref={formRef} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <FileText size={20} className="text-slate-400" />
                    Project Details
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Project Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-slate-900 border-b border-slate-100 pb-2">Project Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Prototype Quantity</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.prototypeQty} onChange={e => setFormData({ ...formData, prototypeQty: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Desired Delivery Date</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.prototypeDate} onChange={e => setFormData({ ...formData, prototypeDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Series Quantity</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.seriesQty} onChange={e => setFormData({ ...formData, seriesQty: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Desired Delivery Date</label>
                                <input type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.seriesDate} onChange={e => setFormData({ ...formData, seriesDate: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-slate-900 border-b border-slate-100 pb-2">Contact Information</h3>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Company Name *</label>
                            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Department</label>
                                <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Position *</label>
                                <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Title *</label>
                                <select required className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}>
                                    <option value="">Select...</option>
                                    <option value="Mr.">Mr.</option>
                                    <option value="Ms.">Ms.</option>
                                    <option value="Dr.">Dr.</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">First Name *</label>
                                <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Last Name *</label>
                                <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Street *</label>
                            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">ZIP Code *</label>
                                <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.zip} onChange={e => setFormData({ ...formData, zip: e.target.value })} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium text-slate-700">City *</label>
                                <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Country *</label>
                            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Phone No *</label>
                                <input required type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">E-mail *</label>
                                <input required type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 bg-duagon-blue text-white py-3 rounded-lg font-bold hover:bg-duagon-blue/90 transition-all mt-6",
                            isSubmitting && "opacity-75 cursor-wait"
                        )}
                    >
                        {isSubmitting ? "Processing..." : <><Send size={18} /> Request Quote</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
