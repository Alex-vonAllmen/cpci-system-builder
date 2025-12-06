import { useAuthStore } from '../store/authStore';

const API_BASE_URL = 'http://localhost:8000/api';

const getHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const token = useAuthStore.getState().token;
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const api = {
    auth: {
        login: async (formData: FormData) => {
            const res = await fetch(`${API_BASE_URL}/admin/login`, {
                method: 'POST',
                body: formData, // FormData automatically sets Content-Type to multipart/form-data
            });
            if (!res.ok) throw new Error('Login failed');
            return res.json();
        }
    },
    products: {
        list: async () => {
            const res = await fetch(`${API_BASE_URL}/admin/products/`);
            const data = await res.json();
            return data.map((p: any) => ({
                ...p,
                powerWatts: p.power_watts,
                widthHp: p.width_hp,
                price1: p.price_1,
                price25: p.price_25,
                price50: p.price_50,
                price100: p.price_100,
                price250: p.price_250,
                price500: p.price_500,
                url: p.url,
                eol_date: p.eol_date,
                heightU: p.height_u,
                externalInterfaces: p.external_interfaces,
            }));
        },
        create: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/admin/products/`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        delete: async (id: string) => {
            await fetch(`${API_BASE_URL}/admin/products/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
        },
        export: async () => {
            const res = await fetch(`${API_BASE_URL}/admin/products/export`, {
                headers: getHeaders(),
            });
            return res.blob();
        },
        import: async (file: File) => {
            // We need to read the file and send it as JSON
            const text = await file.text();
            const json = JSON.parse(text); // Validate JSON client-side first

            const res = await fetch(`${API_BASE_URL}/admin/products/import`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(json),
            });
            if (!res.ok) throw new Error('Import failed');
            return res.json();
        },
    },
    rules: {
        list: async () => {
            const res = await fetch(`${API_BASE_URL}/admin/rules/`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/admin/rules/`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        update: async (id: number, data: any) => {
            const res = await fetch(`${API_BASE_URL}/admin/rules/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        delete: async (id: number) => {
            await fetch(`${API_BASE_URL}/admin/rules/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
        },
        export: async () => {
            const res = await fetch(`${API_BASE_URL}/admin/rules/export`, {
                headers: getHeaders(),
            });
            return res.blob();
        },
        import: async (file: File) => {
            const text = await file.text();
            const json = JSON.parse(text);

            const res = await fetch(`${API_BASE_URL}/admin/rules/import`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(json),
            });
            if (!res.ok) throw new Error('Import failed');
            return res.json();
        },
    },
    settings: {
        list: async () => {
            const res = await fetch(`${API_BASE_URL}/admin/settings/`, {
                headers: getHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        update: async (key: string, value: string) => {
            const res = await fetch(`${API_BASE_URL}/admin/settings/${key}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ key, value }),
            });
            return res.json();
        }
    },
    config: {
        requestQuote: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/config/quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to request quote');
            return res.json();
        }
    },
    examples: {
        list: async () => {
            const res = await fetch(`${API_BASE_URL}/examples/`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/examples/`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        update: async (id: number, data: any) => {
            const res = await fetch(`${API_BASE_URL}/examples/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        delete: async (id: number) => {
            await fetch(`${API_BASE_URL}/examples/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
        }
    },
    articles: {
        list: async () => {
            const res = await fetch(`${API_BASE_URL}/articles/`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/articles/`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        update: async (id: number, data: any) => {
            const res = await fetch(`${API_BASE_URL}/articles/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return res.json();
        },
        delete: async (id: number) => {
            await fetch(`${API_BASE_URL}/articles/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
        },
        import: async (file: File) => {
            const text = await file.text();
            const json = JSON.parse(text);
            const res = await fetch(`${API_BASE_URL}/articles/import`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(json),
            });
            return res.json();
        },
        export: async () => {
            const res = await fetch(`${API_BASE_URL}/articles/export`, {
                headers: getHeaders()
            });
            return res.blob();
        }
    }
};
