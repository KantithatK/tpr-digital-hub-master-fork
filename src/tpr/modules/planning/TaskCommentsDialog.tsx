import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import { supabase } from '../../../lib/supabaseClient';

type Props = {
  open: boolean;
  taskId: number | null;
  onClose: () => void;
  onUpdated?: () => void;
};

export default function TaskCommentsDialog({ open, taskId, onClose, onUpdated }: Props) {
  const [comments, setComments] = React.useState<any[]>([]);
  const [newComment, setNewComment] = React.useState('');
  const [currentEmployeeId, setCurrentEmployeeId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && taskId) loadComments();
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

  async function loadComments() {
    if (!taskId) return;
    setLoading(true);
    try {
      const { data: rawComments, error } = await supabase
        .from('tpr_task_comments')
        .select('id, comment_text, created_by, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (rawComments || []) as any[];

      const creatorIds = Array.from(new Set(rows.map(r => r.created_by).filter(Boolean)));
      let creators: any[] = [];
      if (creatorIds.length > 0) {
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .select('id, first_name_th, last_name_th, image_url')
          .in('id', creatorIds);
        if (empError) console.error('loadComments - employee lookup error', empError);
        else creators = empData || [];
      }

      const empMap = new Map<string, any>();
      creators.forEach((e: any) => empMap.set(e.id, { name: `${e.first_name_th || ''} ${e.last_name_th || ''}`.trim(), image_url: e.image_url }));

      const withAuthors = rows.map(r => ({
        ...r,
        author_name: r.created_by ? (empMap.get(r.created_by)?.name || '-') : '-',
        author_image: r.created_by ? (empMap.get(r.created_by)?.image_url || null) : null,
      }));

      setComments(withAuthors);
    } catch (e) {
      console.error('loadComments', e);
    } finally {
      setLoading(false);
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
          const orExpr = `current_address_email_1.eq.${email},current_address_email_2.eq.${email},current_address_email_3.eq.${email}`;
          const { data: empData, error: empError } = await supabase
            .from('employees')
            .select('id')
            .or(orExpr)
            .limit(1);
          if (empError) console.warn('employee lookup error', empError);
          else if (empData && empData.length > 0) employeeId = empData[0].id as string;
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

  function initialsFromName(name?: string) {
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean).slice(0,2);
    return parts.map(p => p[0].toUpperCase()).join('') || '?';
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box component="span" sx={{ fontWeight: 600 }}>คอมเมนต์</Box>
          <Box>
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
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
            ) : (
              <>
                {comments.map(c => (
                  <Box key={c.id} sx={{ p: 1, borderRadius: 1, bgcolor: '#fafafa' }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Avatar src={c.author_image || undefined} sx={{ width: 32, height: 32 }}>{!c.author_image ? initialsFromName(c.author_name) : null}</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{c.author_name || '-'}</Typography>
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
                ))}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <TextField fullWidth size="small" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="พิมพ์คอมเมนต์..." />
                  <Button variant="contained" onClick={handleAddComment}>ส่ง</Button>
                </Stack>
              </>
            )}
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
