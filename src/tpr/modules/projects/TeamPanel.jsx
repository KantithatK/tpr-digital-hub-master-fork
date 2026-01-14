import * as React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
// use centralized data helpers; `supabase` is not used here directly
import { fetchProjectTeam } from '../../../api/supabaseData';

export default function TeamPanel({ projectId, onReady }) {
    const [teamMembers, setTeamMembers] = React.useState([]);
    const [teamLoading, setTeamLoading] = React.useState(false);

    const formatCurrencyNumber = (n) => {
        if (n === null || n === undefined) return '0.00';
        const num = Number(n);
        if (Number.isNaN(num)) return '0.00';
        return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    React.useEffect(() => {
        let mounted = true;
        const loadTeam = async () => {
            if (!projectId) {
                setTeamMembers([]);
                setTeamLoading(false);
                
                if (typeof onReady === 'function') onReady();
                return;
            }
            setTeamLoading(true);
            try {
                const { data, error } = await fetchProjectTeam(projectId);
                if (error) throw error;
                if (!mounted) return;
                setTeamMembers(data || []);
                setTeamLoading(false);
                if (typeof onReady === 'function') onReady();
            } catch (err) {
                console.error('Load team members error', err);
                if (!mounted) return;
                setTeamMembers([]);
                setTeamLoading(false);
                if (typeof onReady === 'function') onReady();
            }
        };
        loadTeam();
        return () => { mounted = false; };
    }, [projectId, onReady]);

    if (teamLoading) return (<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}><CircularProgress color="error" /></Box>);

    return (
        <>
            {/* <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                ทีมงาน
            </Typography> */}
            {(teamMembers && teamMembers.length > 0) ? (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, width: 64 }}>รูปภาพ</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>พนักงาน</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>ตำแหน่ง</TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>อัตราบิล (บาท/ชม.)</TableCell>
                            {/* <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>ต้นทุน (บาท/ชม.)</TableCell> */}
                            <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>การจัดสรร</TableCell>
                            {/* <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell> */}
                        </TableRow> 
                    </TableHead>
                    <TableBody>
                        {teamMembers.map(m => {
                            const avatarSrc = m.avatar_url || m.avatar || m.photo_url || m.image_url || m.profile_image_url || null;
                            const getInitials = (name) => {
                                if (!name) return '';
                                const parts = String(name).trim().split(/\s+/);
                                // Return only the first letter of the first part (single-character initial)
                                return (parts[0] && String(parts[0][0])) ? String(parts[0][0]).toUpperCase() : '';
                            };
                            const initials = getInitials(m.label);
                            return (
                                <TableRow key={m.id}>
                                    <TableCell>
                                        <Tooltip title={m.label || ''}>
                                            <Avatar src={avatarSrc || undefined} alt={m.label || ''} sx={{ width: 32, height: 32, fontSize: 14 }}>{!avatarSrc ? initials : null}</Avatar>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Typography>{m.label}</Typography>
                                    </TableCell>
                                    <TableCell>{m.position_label || (m.position_id ? m.position_id : '-')}</TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>{formatCurrencyNumber(m.billingRate)}</TableCell>
                                    {/* <TableCell sx={{ textAlign: 'right' }}>{formatCurrencyNumber(m.costRate)}</TableCell> */}
                                    <TableCell sx={{ textAlign: 'right' }}>{(m.allocationHours ? m.allocationHours + ' ชม.' : '0 ชม.')}</TableCell>
                                    {/* <TableCell>{m.status || 'ใช้งานอยู่'}</TableCell> */}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            ) : (
                <Typography sx={{ textAlign: 'center' }} color="text.secondary">ยังไม่มีพนักงานที่มาจากงานย่อยในโครงการนี้</Typography>
            )}
        </>
    );
}
