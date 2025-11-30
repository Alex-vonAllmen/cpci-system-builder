import { useState, useEffect } from 'react';
import { useConfigStore } from '../store/configStore';

import { type Product } from '../data/mockProducts';
import { ArrowLeft, Send, FileText, CheckCircle, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export function QuotePage() {
    const { slots, chassisId, chassisOptions, psuId, psuOptions, products, fetchProducts, resetConfig } = useConfigStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (products.length === 0) fetchProducts();
    }, []);

    const handleStartNew = () => {
        resetConfig();
        navigate('/');
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

    // 1. Gather all selected items with their options
    const selectedItems: { product: Product, options: Record<string, any>, slotLabel: string }[] = [];

    // Chassis
    if (chassisId) {
        const p = products.find((p: any) => p.id === chassisId);
        if (p) selectedItems.push({ product: p, options: chassisOptions || {}, slotLabel: 'Chassis' });
    }

    // PSU
    if (psuId) {
        const p = products.find((p: any) => p.id === psuId);
        if (p) selectedItems.push({ product: p, options: psuOptions || {}, slotLabel: 'PSU' });
    }

    // Slots (Components & Fillers)
    const fillerProduct = products.find((p: any) => p.id === 'FILLER_4HP');

    // Sort slots by ID to ensure order
    const sortedSlots = [...slots].sort((a, b) => a.id - b.id);

    sortedSlots.forEach(slot => {
        if (slot.componentId) {
            const p = products.find((p: any) => p.id === slot.componentId);
            if (p) {
                selectedItems.push({
                    product: p,
                    options: slot.selectedOptions || {},
                    slotLabel: slot.id.toString()
                });
            }
        } else if (slot.type === 'peripheral' && fillerProduct) {
            selectedItems.push({
                product: fillerProduct,
                options: {},
                slotLabel: slot.id.toString()
            });
        }
    });

    // Backplane Logic
    // Construct the backplane configuration based on slots
    const backplaneConnectors: Record<string, string[]> = {};
    sortedSlots.forEach(slot => {
        let connectors: string[] = ['P1']; // Default mandatory for all slots
        if (slot.componentId) {
            const p = products.find((p: any) => p.id === slot.componentId);
            if (p && p.connectors && p.connectors.length > 0) {
                connectors = p.connectors;
            }
        }
        // Ensure P1 is always present
        if (!connectors.includes('P1')) connectors.push('P1');

        backplaneConnectors[`Slot ${slot.id}`] = connectors.sort();
    });

    // Add Backplane as a virtual item
    selectedItems.push({
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
            connectors: [], // Not used for the item itself
        } as any,
        options: backplaneConnectors, // Storing connector map in options for display
        slotLabel: 'Backplane'
    });

    // 2. Calculate Totals (including options)
    // Helper to get price based on quantity
    const getPriceForQuantity = (product: any, qty: number) => {
        if (!product) return 0;
        if (qty >= 500) return product.price500 || product.price1;
        if (qty >= 250) return product.price250 || product.price1;
        if (qty >= 100) return product.price100 || product.price1;
        if (qty >= 50) return product.price50 || product.price1;
        if (qty >= 25) return product.price25 || product.price1;
        return product.price1 || 0;
    };

    // Helper to get option price based on quantity
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

    // Calculate totals
    const prototypeTotal = selectedItems.reduce((sum, item) => {
        const basePrice = getPriceForQuantity(item.product, prototypeQtyNum);

        let itemOptionPrice = 0;
        if (item.product.options) {
            Object.entries(item.options).forEach(([optId, optVal]) => {
                const optDef = (item.product.options as any[]).find((o: any) => o.id === optId);
                if (optDef) {
                    if (optDef.type === 'select') {
                        const choice = optDef.choices.find((c: any) => c.value === optVal);
                        if (choice) itemOptionPrice += getOptionPrice(choice.priceMod, prototypeQtyNum);
                    } else if (optDef.type === 'boolean' && optVal === true) {
                        itemOptionPrice += getOptionPrice(optDef.priceMod, prototypeQtyNum);
                    }
                }
            });
        }

        return sum + (basePrice + itemOptionPrice);
    }, 0);

    const seriesTotal = selectedItems.reduce((sum, item) => {
        const basePrice = getPriceForQuantity(item.product, seriesQtyNum);

        let itemOptionPrice = 0;
        if (item.product.options) {
            Object.entries(item.options).forEach(([optId, optVal]) => {
                const optDef = (item.product.options as any[]).find((o: any) => o.id === optId);
                if (optDef) {
                    if (optDef.type === 'select') {
                        const choice = optDef.choices.find((c: any) => c.value === optVal);
                        if (choice) itemOptionPrice += getOptionPrice(choice.priceMod, seriesQtyNum);
                    } else if (optDef.type === 'boolean' && optVal === true) {
                        itemOptionPrice += getOptionPrice(optDef.priceMod, seriesQtyNum);
                    }
                }
            });
        }
        return sum + (basePrice + itemOptionPrice);
    }, 0);

    // Calculate Grand Total
    // Default to 1 unit for prototype if not specified, to show a realistic estimate
    const prototypeGrandTotal = prototypeTotal * (prototypeQtyNum || 1);
    const seriesGrandTotal = seriesTotal * seriesQtyNum;
    const totalCost = prototypeGrandTotal + seriesGrandTotal;

    const totalPower = selectedItems.reduce((sum, item) => sum + (item.product.powerWatts || 0), 0);

    const generatePDF = async (returnBlob = false) => {
        // Dynamic import to avoid SSR issues if any (though this is SPA)
        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text("System Quotation", 14, 22);

        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Reference: ${Math.random().toString(36).substring(7).toUpperCase()}`, 14, 35);

        // BOM Table
        const tableData = selectedItems.map(item => {
            const unitPriceProto = getPriceForQuantity(item.product, prototypeQtyNum);
            let optionPriceProto = 0;
            if (item.product.options) {
                Object.entries(item.options).forEach(([optId, optVal]) => {
                    const optDef = (item.product.options as any[]).find((o: any) => o.id === optId);
                    if (optDef) {
                        if (optDef.type === 'select') {
                            const choice = optDef.choices.find((c: any) => c.value === optVal);
                            if (choice) optionPriceProto += getOptionPrice(choice.priceMod, prototypeQtyNum);
                        } else if (optDef.type === 'boolean' && optVal === true) {
                            optionPriceProto += getOptionPrice(optDef.priceMod, prototypeQtyNum);
                        }
                    }
                });
            }
            const totalUnitProto = unitPriceProto + optionPriceProto;

            // Format connectors string
            let connectorsStr = '';
            if (item.product.type === 'backplane') {
                // For backplane, we might want a separate table or a summary.
                // For now, let's just say "See Config".
                connectorsStr = 'See Config';
            } else {
                connectorsStr = (item.product.connectors || []).join(', ');
            }

            return [
                item.slotLabel,
                item.product.id,
                item.product.name,
                connectorsStr,
                item.product.type === 'backplane' ? '-' : `${item.product.widthHp}HP`,
                item.product.type,
                `€${totalUnitProto.toLocaleString()}`
            ];
        });

        autoTable(doc, {
            head: [['Slot', 'Part Number', 'Description', 'Connectors', 'Width', 'Type', 'Unit Price']],
            body: tableData,
            startY: 40,
            styles: { fontSize: 8 },
            columnStyles: {
                2: { cellWidth: 40 }, // Description
                3: { cellWidth: 20 }  // Connectors
            }
        });

        // Add Backplane Configuration Table
        const backplaneItem = selectedItems.find(i => i.product.type === 'backplane');
        if (backplaneItem) {
            const bpData = Object.entries(backplaneItem.options).map(([slot, conns]) => [slot, (conns as string[]).join(', ')]);

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.text("Backplane Configuration", 14, finalY);

            autoTable(doc, {
                head: [['Slot', 'Required Connectors']],
                body: bpData,
                startY: finalY + 5,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
            });
        }

        // Totals
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.text(`Prototype Qty: ${prototypeQtyNum}`, 14, finalY);
        doc.text(`Series Qty: ${seriesQtyNum}`, 14, finalY + 5);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Estimated Total: €${totalCost.toLocaleString()}`, 14, finalY + 15);

        if (returnBlob) {
            return doc.output('datauristring');
        } else {
            doc.save("quotation.pdf");
        }
    };

    const handleDownloadPDF = () => generatePDF(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Send data to backend
        try {
            const { api } = await import('../services/api');

            // Generate PDF and JSON blobs
            const pdfBase64 = await generatePDF(true);

            const bomData = selectedItems.map(item => ({
                slot: item.slotLabel,
                component: item.product.name,
                partNumber: item.product.id,
                connectors: item.product.connectors || [],
                options: item.options
            }));
            const jsonBase64 = "data:application/json;base64," + btoa(JSON.stringify(bomData, null, 2));

            const payload = {
                user: formData,
                config: { slots, chassisId, psuId },
                items: selectedItems.map(item => ({
                    slotLabel: item.slotLabel,
                    product: {
                        id: item.product.id,
                        name: item.product.name,
                        type: item.product.type
                    },
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
            alert("Failed to submit quote. Please try again.");
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
                <p className="text-slate-500 max-w-md">
                    Thank you, {formData.firstName}. We have received your configuration and will send a detailed quote to <strong>{formData.email}</strong> shortly.
                </p>
                <button
                    onClick={handleStartNew}
                    className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                    Start New Configuration
                </button>
            </div>
        );
    }

    const handleDownloadJSON = () => {
        const bomData = selectedItems.map(item => ({
            slot: item.slotLabel,
            component: item.product.name,
            partNumber: item.product.id,
            connectors: item.product.connectors || [],
            options: item.options
        }));

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bomData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "system_configuration.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Review & Quote</h1>
                    <p className="text-slate-500">
                        Review your system configuration and request a formal quote.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link
                        to="/chassis"
                        className="inline-flex items-center justify-center gap-2 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </Link>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadJSON}
                            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                            <Download size={18} />
                            JSON
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                            <FileText size={18} />
                            PDF
                        </button>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bill of Materials */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <FileText size={20} className="text-slate-400" />
                            Bill of Materials
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {selectedItems.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                No components selected.
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <FileText size={20} />
                                    Bill of Materials
                                </h3>
                                <div className="space-y-3">
                                    {selectedItems.map((item, idx) => {
                                        // Calculate unit price for this item (using prototype qty as base reference for display, or show range?)
                                        // Let's show the unit price for the Prototype Qty
                                        const unitPriceProto = getPriceForQuantity(item.product, prototypeQtyNum);
                                        const unitPriceSeries = getPriceForQuantity(item.product, seriesQtyNum);

                                        let optionPriceProto = 0;
                                        let optionPriceSeries = 0;

                                        if (item.product.options) {
                                            Object.entries(item.options).forEach(([optId, optVal]) => {
                                                const optDef = (item.product.options as any[]).find((o: any) => o.id === optId);
                                                if (optDef) {
                                                    if (optDef.type === 'select') {
                                                        const choice = optDef.choices.find((c: any) => c.value === optVal);
                                                        if (choice) {
                                                            optionPriceProto += getOptionPrice(choice.priceMod, prototypeQtyNum);
                                                            optionPriceSeries += getOptionPrice(choice.priceMod, seriesQtyNum);
                                                        }
                                                    } else if (optDef.type === 'boolean' && optVal === true) {
                                                        optionPriceProto += getOptionPrice(optDef.priceMod, prototypeQtyNum);
                                                        optionPriceSeries += getOptionPrice(optDef.priceMod, seriesQtyNum);
                                                    }
                                                }
                                            });
                                        }

                                        return (
                                            <div key={idx} className="flex justify-between items-start text-sm p-2 bg-white rounded border border-slate-100">
                                                <div>
                                                    <div className="font-medium">{item.product.name}</div>
                                                    <div className="text-slate-500 text-xs">{item.product.id}</div>
                                                    {Object.keys(item.options).length > 0 && item.product.type !== 'backplane' && (
                                                        <div className="text-xs text-slate-400 mt-1">
                                                            {Object.entries(item.options).map(([key, val]) => `${key}: ${val}`).join(', ')}
                                                        </div>
                                                    )}
                                                    {item.product.type === 'backplane' && (
                                                        <div className="text-xs text-slate-500 mt-1 font-mono bg-slate-100 p-2 rounded">
                                                            {Object.entries(item.options).map(([slot, conns]) => (
                                                                <div key={slot}>{slot}: {(conns as string[]).join(', ')}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium">€{(unitPriceProto + optionPriceProto).toLocaleString()} (Proto)</div>
                                                    {seriesQtyNum > 0 && (
                                                        <div className="text-xs text-slate-500">€{(unitPriceSeries + optionPriceSeries).toLocaleString()} (Series)</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="border-t border-slate-200 pt-3 mt-4">
                                        <div className="flex justify-between items-center font-bold text-slate-900">
                                            <span>Prototype Total ({prototypeQtyNum} units)</span>
                                            <span>€{(prototypeTotal * (prototypeQtyNum || 1)).toLocaleString()}</span>
                                        </div>
                                        {seriesQtyNum > 0 && (
                                            <div className="flex justify-between items-center font-bold text-blue-600 mt-2">
                                                <span>Series Total ({seriesQtyNum} units)</span>
                                                <span>€{(seriesTotal * seriesQtyNum).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Total Power Consumption</span>
                            <span>{totalPower}W</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>System EOL</span>
                            <span className="font-medium text-amber-600">
                                {selectedItems.reduce((min, item) => {
                                    let currentMin = min;

                                    // Check product EOL
                                    if (item.product.eol_date) {
                                        if (!currentMin || item.product.eol_date < currentMin) {
                                            currentMin = item.product.eol_date;
                                        }
                                    }

                                    // Check options EOL
                                    if (item.product.options && item.options) {
                                        Object.entries(item.options).forEach(([optId, optVal]) => {
                                            const optDef = (item.product.options as any[]).find((o: any) => o.id === optId);
                                            if (optDef && optDef.type === 'select') {
                                                const choice = optDef.choices.find((c: any) => c.value === optVal);
                                                if (choice && choice.eol_date) {
                                                    if (!currentMin || choice.eol_date < currentMin) {
                                                        currentMin = choice.eol_date;
                                                    }
                                                }
                                            }
                                        });
                                    }

                                    return currentMin;
                                }, '' as string).split('-')[0] || 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200/50">
                            <span>Estimated Total</span>
                            <span>€{totalCost.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Request Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6">Project Details</h2>

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
                                "w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all mt-6",
                                isSubmitting && "opacity-75 cursor-wait"
                            )}
                        >
                            {isSubmitting ? (
                                "Processing..."
                            ) : (
                                <>
                                    <Send size={18} />
                                    Request Quote
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
