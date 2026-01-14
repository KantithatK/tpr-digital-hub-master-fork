import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../../../lib/supabaseClient';
import DownloadIcon from '@mui/icons-material/Download';

function formatBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return '';
  const b = Number(bytes);
  if (Number.isNaN(b)) return '';
  if (b === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  const value = +(b / Math.pow(1024, i)).toFixed(2);
  return `${value} ${units[i]}`;
}

type Props = {
  open: boolean;
  taskId: number | null;
  projectId?: string | number | null;
  onClose: () => void;
  onUpdated?: () => void;
};

export default function TaskAttachmentsDialog({ open, taskId, projectId, onClose, onUpdated }: Props) {
  const [files, setFiles] = React.useState<Array<{ id: number; name: string; size?: number; created_at?: string; path: string }>>([]);
  const [uploading, setUploading] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [phaseId, setPhaseId] = React.useState<number | null>(null);

  const bucket = 'project-files';

  React.useEffect(() => {
    if (open && taskId) {
      resolvePhaseAndLoad();
    }
  }, [open, taskId]);

  async function resolvePhaseAndLoad() {
    if (!taskId) return;
    setLoading(true);
    try {
      // fetch task to get phase_id if not known
      const { data: trow, error: terr } = await supabase
        .from('tpr_project_wbs_tasks')
        .select('id, phase_id')
        .eq('id', taskId)
        .single();
      if (terr) throw terr;
      const pid = Number(trow?.phase_id ?? null) || null;
      setPhaseId(pid);
      await loadFiles(pid);
    } catch (e) {
      console.error('resolvePhaseAndLoad', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles(pid: number | null) {
    if (!taskId) { setFiles([]); return; }
    try {
      const { data, error } = await supabase
        .from('tpr_task_attachments')
        .select('id, file_name, file_size, created_at, file_path')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({ id: Number(r.id), name: r.file_name, size: r.file_size, created_at: r.created_at, path: r.file_path }));
      setFiles(rows);
    } catch (e) {
      console.error('loadFiles', e);
      setFiles([]);
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const filesSel = e.target.files;
    if (!filesSel || !taskId || !projectId || !phaseId) return;
    const file = filesSel[0];
    setUploading(true);
    try {
      const folder = `${projectId}/${phaseId}/${taskId}`;
      const path = `${folder}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file as File, { upsert: false });
      if (uploadError) throw uploadError;
      // record in DB
      let uploadedBy: string | null = null;
      try {
        const res = await (supabase.auth as any).getUser?.();
        uploadedBy = res?.data?.user?.id || null;
      } catch {}
      const { error: insertError } = await supabase
        .from('tpr_task_attachments')
        .insert([{ task_id: taskId, file_name: file.name, file_path: path, file_size: file.size, mime_type: file.type, uploaded_by: uploadedBy }]);
      if (insertError) throw insertError;
      await loadFiles(phaseId);
      onUpdated && onUpdated();
    } catch (err) {
      console.error('upload file error', err);
      alert('อัปโหลดไฟล์ไม่สำเร็จ');
    } finally {
      setUploading(false);
      // clear input value
      try { (e.target as HTMLInputElement).value = ''; } catch {}
    }
  }

  async function downloadFile(name: string, path: string) {
    try {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error) throw error;
      const blobUrl = URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (e) {
      console.error('download error', e);
      alert('ดาวน์โหลดไฟล์ไม่สำเร็จ');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" keepMounted>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box component="span" sx={{ fontWeight: 600 }}>ไฟล์แนบ</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton aria-label="close" size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stack spacing={1}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              files.map(f => (
                <Box key={f.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                  <Box>
                    <Typography variant="body2">{f.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatBytes(f.size)}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" onClick={() => downloadFile(f.name, f.path)}>
                      ดาวน์โหลด
                    </Button>
                  </Stack>
                </Box>
              ))
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1, gap: 1 }}>
              {uploading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="caption">กำลังอัปโหลด...</Typography>
                </Box>
              )}
              <Button variant="contained" component="label" disabled={uploading} startIcon={<UploadFileIcon />} sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}>
                อัปโหลดไฟล์
                <input hidden type="file" onChange={handleFileInput} />
              </Button>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
