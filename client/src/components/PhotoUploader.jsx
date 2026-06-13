import { useRef, useState } from 'react';
import api from '../api';
import { ImagePlus, X } from 'lucide-react';

// 嘉宾照片上传：value 为 JSON 数组字符串（存 uploads/ 文件名），onChange 回传新值
export default function PhotoUploader({ value, onChange, max = 3 }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  let photos = [];
  try { photos = value ? JSON.parse(value) : []; } catch { /* 忽略脏数据 */ }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []).slice(0, max - photos.length);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const added = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('photo', file);
        const { data } = await api.post('/uploads/photo', fd);
        added.push(data.filename);
      }
      onChange(JSON.stringify([...photos, ...added]));
    } catch (err) {
      setError(err.response?.data?.error || '上传失败');
    } finally {
      setUploading(false);
    }
  }

  function remove(name) {
    onChange(JSON.stringify(photos.filter(p => p !== name)));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map(name => (
          <div key={name} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
            <img src={`/uploads/${name}`} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => remove(name)}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={12} />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50">
            <ImagePlus size={20} />
            <span className="text-xs mt-1">{uploading ? '上传中' : '添加'}</span>
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleFiles} />
    </div>
  );
}
