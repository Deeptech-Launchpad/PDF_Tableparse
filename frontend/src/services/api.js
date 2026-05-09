// frontend/src/services/api.js
import axios from 'axios';

const API_BASE = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
});

export const pdfService = {
  upload: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadUrl: (url) => api.post('/upload-url', { url }),
  list: () => api.get('/pdfs'),
  getDetails: (id) => api.get(`/pdfs/${id}`),
  updatePdf: (id, data) => api.patch(`/pdfs/${id}`, data),
  export: (id, type, manualOnly = false) => api.get(`/pdfs/${id}/export?export_type=${type}&manual_only=${manualOnly}`),
  exportBatch: (ids, type, manualOnly = false) => api.post(`/pdfs/export-batch`, { pdf_ids: ids, export_type: type, manual_only: manualOnly }),
  generatePdf: (data, templateId = null) => api.post(`/pdfs/generate-pdf${templateId ? `?template_id=${templateId}` : ''}`, data),
  uploadTemplate: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/templates/upload', formData);
  },
  listTemplates: () => api.get('/templates'),
  manualCrop: (id, pageNum, data) => api.post(`/pdfs/${id}/pages/${pageNum}/crop`, data),
  downloadBatch: (paths) => api.post(`/download-batch`, { paths }, { responseType: 'blob' }),
  updateFields: (pdfId, sectionId, fields) => api.patch(`/pdfs/${pdfId}/sections/${sectionId}/fields`, fields),
  delete: (id) => api.delete(`/pdfs/${id}`),
};

export default api;
