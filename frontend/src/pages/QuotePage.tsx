import { useState, useEffect } from 'react';
import { useConfigStore } from '../store/configStore';

import { type Product } from '../data/mockProducts';
import { ArrowLeft, Send, FileText, CheckCircle, Download, Cable } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

import { useToast } from '../components/ui/Toast';

export function QuotePage() {
    const { slots, chassisId, chassisOptions, psuId, psuOptions, products, articles, fetchProducts, resetConfig } = useConfigStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();

    useEffect(() => {
        if (products.length === 0) fetchProducts();
    }, []);

    const handleStartNew = () => {
        resetConfig();
        navigate('/');
    };

    // Helper to find matching article
    const findMatchingArticle = (productId: string, options: Record<string, any>) => {
        return articles?.find((a: any) => {
            if (a.product_id !== productId) return false;

            const articleOptions = a.selected_options || {};
            const itemOptions = options || {};

            console.log(`Checking match for ${productId}:`, { articleOptions, itemOptions });

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
            // (e.g. if item has {ram: 16gb, extra: true} and article is just {ram: 16gb}, it's NOT a match)
            const noExtraRequirements = itemKeys.every(key => {
                // If the key is already in article, we checked it above.
                if (Object.prototype.hasOwnProperty.call(articleOptions, key)) return true;

                // If key is NOT in article, it must be "empty"/false to still match
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

    // 1. Gather all selected items with their options
    const selectedItems: { product: Product, options: Record<string, any>, slotLabel: string }[] = [];

    // Chassis
    if (chassisId) {
        const p = products.find((p: any) => p.id === chassisId);
        if (p) selectedItems.push({ product: p, options: chassisOptions || {}, slotLabel: 'Chassis' });
    }

    // PSU
    if (psuId) {
        // Only add as separate item if NOT in slots (i.e. not pluggable)
        const isPluggable = slots.some(s => s.type === 'psu' && s.componentId === psuId);
        if (!isPluggable) {
            const p = products.find((p: any) => p.id === psuId);
            if (p) selectedItems.push({ product: p, options: psuOptions || {}, slotLabel: 'PSU' });
        }
    }

    // Slots (Components & Fillers)
    const fillerProduct = products.find((p: any) => p.id === 'FILLER_4HP');

    // Sort slots by ID to ensure order
    const sortedSlots = [...slots].sort((a, b) => a.id - b.id);

    sortedSlots.forEach(slot => {
        if (slot.blockedBy) return; // Skip blocked slots (multi-slot components)

        if (slot.componentId) {
            const p = products.find((p: any) => p.id === slot.componentId);
            if (p) {
                selectedItems.push({
                    product: p,
                    options: slot.selectedOptions || {},
                    slotLabel: slot.type === 'psu' ? `Slot ${slot.id} (PSU)` : slot.id.toString()
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
        if (slot.type === 'psu') return; // Skip PSU slots for backplane connectors

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



    // Calculate Power
    const powerConsumption = selectedItems.reduce((sum, item) => {
        // Skip PSU from consumption (it provides power)
        if (item.product.type === 'psu') return sum;

        let watts = item.product.powerWatts || 0;

        // Add power from options
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

    // Aggregating External Interfaces
    const aggregatedInterfaces: Record<string, { type: string, connector: string, count: number }> = {};

    selectedItems.forEach(item => {
        // Product Interfaces
        if (item.product.externalInterfaces) {
            item.product.externalInterfaces.forEach(iface => {
                const key = `${iface.type}-${iface.connector}`;
                if (!aggregatedInterfaces[key]) {
                    aggregatedInterfaces[key] = { ...iface, count: 0 };
                }
                aggregatedInterfaces[key].count += iface.count;
            });
        }

        // Option Interfaces
        if (item.product.options && item.options) {
            Object.entries(item.options).forEach(([optId, optVal]) => {
                const optDef = (item.product.options as any[]).find((o: any) => o.id === optId);
                if (optDef) {
                    let modInterfaces = null;
                    if (optDef.type === 'select') {
                        const choice = optDef.choices.find((c: any) => c.value === optVal);
                        if (choice && choice.externalInterfacesMod) {
                            modInterfaces = choice.externalInterfacesMod;
                        }
                    } else if (optDef.type === 'boolean' && optVal === true) {
                        if (optDef.externalInterfacesMod) {
                            modInterfaces = optDef.externalInterfacesMod;
                        }
                    }

                    if (modInterfaces) {
                        modInterfaces.forEach((iface: any) => {
                            const key = `${iface.type}-${iface.connector}`;
                            if (!aggregatedInterfaces[key]) {
                                aggregatedInterfaces[key] = { ...iface, count: 0 };
                            }
                            aggregatedInterfaces[key].count += iface.count;
                        });
                    }
                }
            });
        }
    });

    const sortedInterfaces = Object.values(aggregatedInterfaces).sort((a, b) => a.type.localeCompare(b.type));

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

            // Article Match
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
                items: selectedItems.map(item => {
                    const article = findMatchingArticle(item.product.id, item.options);
                    return {
                        slotLabel: item.slotLabel,
                        product: {
                            id: item.product.id,
                            name: item.product.name,
                            type: item.product.type
                        },
                        articleNumber: article ? article.article_number : undefined,
                        options: item.options
                    };
                }),
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
        const fullConfig = {
            slotCount: slots.length,
            systemSlotPosition: useConfigStore.getState().systemSlotPosition,
            chassisId,
            chassisOptions,
            psuId,
            psuOptions,
            slots: slots.map(s => ({
                id: s.id,
                type: s.type,
                componentId: s.componentId,
                selectedOptions: s.selectedOptions,
                width: s.width,
                blockedBy: s.blockedBy
            }))
        };

        const exportData = {
            bom: selectedItems.map(item => {
                const article = findMatchingArticle(item.product.id, item.options);
                return {
                    slot: item.slotLabel,
                    component: item.product.name,
                    partNumber: article ? article.article_number : item.product.id,
                    isArticle: !!article,
                    connectors: item.product.connectors || [],
                    options: item.options
                };
            }),
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
                <div className="space-y-8">
                    {/* External Interface Summary */}
                    {sortedInterfaces.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <Cable size={20} className="text-slate-400" />
                                    External Interface Summary
                                </h2>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-4">
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
                        </div>
                    )}

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

                                            const article = findMatchingArticle(item.product.id, item.options);

                                            // Determine Article Number to display
                                            // If matched: use article.article_number
                                            // If not matched: use {Product.id}-xx
                                            const displayArticleNumber = article ? article.article_number : `${item.product.id}-xx`;

                                            return (
                                                <div key={idx} className="flex justify-between items-start text-sm p-3 bg-white rounded border border-slate-100">
                                                    <div className="flex-1">
                                                        {/* Row 1: Slot | Article# | Name | Price(S) */}
                                                        <div className="flex items-center gap-3 font-medium text-slate-900 mb-1">
                                                            <span className="text-slate-500 font-mono w-8">{item.slotLabel}</span>
                                                            <span className="font-mono text-duagon-blue min-w-[120px]">{displayArticleNumber}</span>
                                                            <span className="flex-1">{item.product.name}</span>
                                                            <span className="text-right w-24 tabular-nums">€{(unitPriceSeries + optionPriceSeries).toLocaleString()}</span>
                                                        </div>

                                                        {/* Row 2: Part# | Price(P) */}
                                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                                            <span className="w-8"></span> {/* Spacer for Slot */}
                                                            <span className="font-mono min-w-[120px]">{item.product.id}</span>
                                                            <span className="flex-1 italic">
                                                                {article ? (
                                                                    <span className="flex items-center gap-1 text-green-600">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                        Matched
                                                                    </span>
                                                                ) : "Standard Configuration"}
                                                            </span>
                                                            <span className="text-right w-24 tabular-nums">€{(unitPriceProto + optionPriceProto).toLocaleString()} (Proto)</span>
                                                        </div>
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
                                                <div className="flex justify-between items-center font-bold text-duagon-blue mt-2">
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
                                <span className={cn(isPowerOverload ? "text-red-600 font-bold" : "")}>
                                    {powerConsumption}W / {powerCapacity > 0 ? `${powerCapacity}W` : 'External'}
                                </span>
                            </div>
                            {isPowerOverload && (
                                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                    Warning: Power consumption exceeds PSU capacity!
                                </div>
                            )}
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
                                "w-full flex items-center justify-center gap-2 bg-duagon-blue text-white py-3 rounded-lg font-bold hover:bg-duagon-blue/90 transition-all mt-6",
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
