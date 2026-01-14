import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import Avatar from '@mui/material/Avatar';
import { supabase } from '../../../lib/supabaseClient';

type Props = {
  open: boolean;
  taskId: number | null;
  onClose: () => void;
  onUpdated?: () => void; // callback to refresh parent counts
};

export default function TaskAttachmentsComments({ open, taskId, onClose, onUpdated }: Props) {
  const [tab, setTab] = React.useState(0);
  const [attachments, setAttachments] = React.useState<any[]>([]);
  const [comments, setComments] = React.useState<any[]>([]);
  const [newComment, setNewComment] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && taskId) {
      loadAttachments();
      loadComments();
    }
    // resolve current employee id from auth user email
    (async function resolveEmployee() {
      try {
        const userRes: any = await supabase.auth.getUser();
        const email = userRes?.data?.user?.email || null;
        if (email) {
          const orExpr = `current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`;
          const { data: empData, error: empError } = await supabase
            .from('employees')
            .select('id')
            .or(orExpr)
            .limit(1);
          if (!empError && empData && empData.length > 0) setCurrentEmployeeId(empData[0].id as string);
        }
      } catch (e) {
        console.warn('resolveEmployee', e);
      }
    })();
  }, [open, taskId]);

  async function loadAttachments() {
    if (!taskId) return;
    try {
      const { data, error } = await supabase
        .from('tpr_task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAttachments(data || []);
    } catch (e) {
      console.error(e);
      // show error in UI if desired
    }
  }

  async function loadComments() {
    if (!taskId) return;
    try {
      // fetch comments including created_by so we can resolve author names
      const { data: rawComments, error } = await supabase
        .from('tpr_task_comments')
        .select('id, comment_text, created_by, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (rawComments || []) as any[];

      // collect unique creator ids
      const creatorIds = Array.from(new Set(rows.map(r => r.created_by).filter(Boolean)));
      let creators: any[] = [];
      if (creatorIds.length > 0) {
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .select('id, first_name_th, last_name_th')
          .in('id', creatorIds);
        if (empError) {
          console.error('loadComments - employee lookup error', empError);
        } else {
          creators = empData || [];
        }
      }

      const empMap = new Map<string, string>();
      creators.forEach((e: any) => empMap.set(e.id, `${e.first_name_th || ''} ${e.last_name_th || ''}`.trim()));

      const withAuthors = rows.map(r => ({
        ...r,
        author_name: r.created_by ? (empMap.get(r.created_by) || '-') : '-',
      }));

      setComments(withAuthors);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !taskId) return;
    const file = files[0];
    setUploading(true);
    try {
      const bucket = 'project-files';
      const randomName = `${Date.now()}-${file.name}`;
      const path = `${taskId}/${randomName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file as File, { upsert: false });
      if (uploadError) throw uploadError;

      // Insert metadata row
      const { data: insertData, error: insertError } = await supabase
        .from('tpr_task_attachments')
        .insert([{ task_id: taskId, file_name: file.name, file_path: path, file_size: file.size, mime_type: file.type }]);
      if (insertError) throw insertError;

      await loadAttachments();
      onUpdated && onUpdated();
    } catch (err) {
      console.error('upload file error', err);
      alert('อัปโหลดไฟล์ไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  }

  async function handleAddComment() {
    if (!taskId || !newComment.trim()) return;
    try {
      // Map auth user email -> employees.id and store that as created_by
      let employeeId: string | null = null;
      try {
        const userRes: any = await supabase.auth.getUser();
        const email = userRes?.data?.user?.email || null;
        if (email) {
          // try to find employee by email in current_address_email_1/2/3
          const orExpr = `current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`;
          const { data: empData, error: empError } = await supabase
            .from('employees')
            .select('id')
            .or(orExpr)
            .limit(1);
          if (empError) {
            console.warn('employee lookup error', empError);
          } else if (empData && empData.length > 0) {
            employeeId = empData[0].id as string;
          }
        }
      } catch (e) {
        console.warn('could not resolve employee from auth user', e);
      }

      const insertPayload: any = { task_id: taskId, comment_text: newComment.trim() };
      if (employeeId) insertPayload.created_by = employeeId;

      const { data, error } = await supabase
        .from('tpr_task_comments')
        .insert([insertPayload]);
      if (error) throw error;
      setNewComment('');
      await loadComments();
      onUpdated && onUpdated();
    } catch (err) {
      console.error('insert comment error', err);
      alert('บันทึกคอมเมนต์ไม่สำเร็จ');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>รายละเอียดไฟล์และคอมเมนต์</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`ไฟล์ (${attachments.length})`} />
          <Tab label={`คอมเมนต์ (${comments.length})`} />
        </Tabs>
        {tab === 0 && (
          <Box >
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="contained" component="label" disabled={uploading} startIcon={<UploadFileIcon />}>
                  อัปโหลดไฟล์
                  <input hidden type="file" onChange={handleFileInput} />
                </Button>
                {uploading && <Typography variant="caption">กำลังอัปโหลด...</Typography>}
              </Stack>
              {attachments.map(a => {
                const publicUrl = supabase.storage.from('project-files').getPublicUrl(a.file_path).data?.publicUrl || '';
                return (
                  <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                    <Typography variant="body2">{a.file_name}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <a href={publicUrl} target="_blank" rel="noreferrer">ดาวน์โหลด</a>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}
        {tab === 1 && (
          <Box >
            <Stack>
                {comments.map(c => {
                  const name = c.author_name || '-';
                  const initials = name && name !== '-' ? name.split(' ').filter(Boolean).slice(0,2).map((n:string) => n[0].toUpperCase()).join('') : '?';
                  return (
                    <Box key={c.id} sx={{ p: 1, borderRadius: 1, bgcolor: '#fafafa' }}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#1976d2', fontSize: '0.9rem' }}>{initials}</Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{name}</Typography>
                            {currentEmployeeId && c.created_by === currentEmployeeId && (
                              <IconButton size="small" onClick={async () => {
                                if (!confirm('ลบคอมเมนต์นี้?')) return;
                                try {
                                  const { error } = await supabase
                                    .from('tpr_task_comments')
                                    .delete()
                                    .match({ id: c.id, created_by: currentEmployeeId });
                                  if (error) throw error;
                                  await loadComments();
                                  onUpdated && onUpdated();
                                } catch (err) {
                                  console.error('delete comment error', err);
                                  alert('ลบคอมเมนต์ไม่สำเร็จ');
                                }
                              }} aria-label="delete-comment">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{c.comment_text}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{new Date(c.created_at).toLocaleString()}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  );
                })}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <TextField fullWidth size="small" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="พิมพ์คอมเมนต์..." />
                  <Button variant="contained" onClick={handleAddComment}>ส่ง</Button>
                </Stack>
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
