// src/components/Organization.jsx
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

// Material UI
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import CircularProgress from '@mui/material/CircularProgress';

// Icons
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined';
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

// Map
import { styled } from '@mui/material/styles';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap, Marker, Circle } from 'react-leaflet';

// === Supabase Storage Config ===
// หมายเหตุ: ต้องมี bucket ชื่อ 'company-logos' ใน Supabase Storage และตั้งค่า public
const LOGO_BUCKET = 'company-logos';

// === Helpers: Resolve & delete old logo from Supabase Storage ===
function extractPathFromPublicUrl(url) {
    try {
        const u = new URL(url);
        const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`;
        const idx = u.pathname.indexOf(marker);
        if (idx === -1) return null; // ไม่ใช่ไฟล์ใน bucket นี้
        return decodeURIComponent(u.pathname.slice(idx + marker.length));
    } catch {
        return null;
    }
}

async function deleteCompanyLogoFromStorage(publicUrl) {
    const path = extractPathFromPublicUrl(publicUrl);
    if (!path) return; // ข้ามถ้า URL ไม่ใช่ของ bucket นี้
    const { error } = await supabase.storage.from(LOGO_BUCKET).remove([path]);
    if (error) console.error('Logo remove error:', error.message);
}

async function uploadCompanyLogoToStorage(file, companyId) {
    // ทำ path ให้สั้นและไม่ชน
    const ext = file.name?.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `logos/${companyId}/${Date.now()}.${ext}`;

    // อัปโหลดไฟล์ขึ้น Storage
    const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || 'application/octet-stream',
        });

    if (uploadError) throw uploadError;

    // ดึง public URL
    const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(filePath);
    // supabase-js v2: data.publicUrl
    return data?.publicUrl || '';
}

function formatDateTH(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' });
}

function FieldItem({ label, value }) {
    return (
        <Stack spacing={0.5} sx={{ py: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
            <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{value ?? '-'}</Typography>
        </Stack>
    );
}

function Section({ icon, title, children }) {
    return (
        <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Box aria-label={title} sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    {icon}
                </Box>
            </Stack>
            {children}
        </Box>
    );
}

const displayValue = (val) => {
    if (val === null || val === undefined || val === "") {
        return "-";
    }
    return val;
};


function NoFocusTab(props) {
    return (
        <Tab
            disableRipple
            disableFocusRipple
            onMouseDown={(e) => e.preventDefault()}
            {...props}
            sx={{ ...props.sx, '&:focus,&.Mui-focusVisible': { outline: 'none' } }}
        />
    );
}

export default function Info() {

    const [errors, setErrors] = React.useState({});

    const mapRef = React.useRef(null);
    const [previewPos, setPreviewPos] = React.useState(null);
    const [mapCenter, setMapCenter] = React.useState([13.756331, 100.501762]);

    const [tab, setTab] = React.useState(0);

    const [company, setCompany] = React.useState(null);
    const [address, setAddress] = React.useState(null);

    const [openModal, setOpenModal] = React.useState(false);
    const [formTab, setFormTab] = React.useState(0);
    const [editMode, setEditMode] = React.useState(false);

    useEnsureLeafletCss(tab === 1);

    const today = new Date().toISOString().split("T")[0];

    const [formCompany, setFormCompany] = React.useState({
        company_code: '',
        branch_tax_no: '',
        name_th: '',
        name_en: '',
        tax_id: '',
        established_date: today,
        logo_url: '',
    });

    const [formAddress, setFormAddress] = React.useState({
        address_type: 'head_office',
        address_name: '',
        house_no: '',
        moo: '',
        building: '',
        floor: '',
        village: '',
        alley: '',
        road: '',
        subdistrict: '',
        district: '',
        province: '',
        postal_code: '',
        country: 'ไทย',
        contact_name: '',
        phone_mobile: '',
        phone: '',
        email: '',
        website: '',
        latitude: '',
        longitude: '',
        radius_meters: '',
    });

    const [logoFile, setLogoFile] = React.useState(null);
    const [logoPreview, setLogoPreview] = React.useState('');
    const fileInputRef = React.useRef(null);
    const [saving, setSaving] = React.useState(false);

    // snackbar
    const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
    const Alert = React.forwardRef(function Alert(props, ref) {
        return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
    });
    const handleCloseSnackbar = (_event, reason) => {
        // ป้องกันปิดเมื่อคลิกนอกกล่อง
        if (reason === 'clickaway') return;
        setSnackbar((s) => ({ ...s, open: false }));
    };

    React.useEffect(() => {
        (async () => {
            try {
                const { data: companyRow, error: cErr } = await supabase
                    .from('company')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (cErr) throw cErr;
                setCompany(companyRow ?? null);
                if (companyRow) {
                    const { data: addrRow, error: aErr } = await supabase
                        .from('company_addresses')
                        .select('*')
                        .eq('company_id', companyRow.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (aErr) throw aErr;
                    setAddress(addrRow ?? null);
                }
            } catch (e) {
                console.error('Initial load error:', e.message);
            }
        })();
    }, []);

    const handleOpenAdd = () => {
        setErrors({});
        setEditMode(false);

        setFormCompany({
            company_code: '',
            branch_tax_no: '',
            name_th: '',
            name_en: '',
            tax_id: '',
            established_date: new Date().toISOString().split("T")[0],
            logo_url: '',
        });

        setFormAddress({
            address_type: 'head_office',
            address_name: '',
            house_no: '',
            moo: '',
            building: '',
            floor: '',
            village: '',
            alley: '',
            road: '',
            subdistrict: '',
            district: '',
            province: '',
            postal_code: '',
            country: 'ไทย',
            contact_name: '',
            phone_mobile: '',
            phone: '',
            email: '',
            website: '',
            latitude: '',
            longitude: '',
            radius_meters: '',
        });

        setLogoFile(null);
        setLogoPreview('');

        if (fileInputRef.current) fileInputRef.current.value = '';

        setFormTab(0);
        setPreviewPos(null);

        setMapCenter([13.756331, 100.501762]);

        setOpenModal(true);
    };

    const handleOpenEdit = async () => {
        if (!company) return;

        setErrors({});
        setEditMode(true);

        setFormCompany({
            company_code: company.company_code || '',
            branch_tax_no: company.branch_tax_no || '',
            name_th: company.name_th || '',
            name_en: company.name_en || '',
            tax_id: company.tax_id || '',
            established_date: company.established_date ? String(company.established_date).slice(0, 10) : '',
            logo_url: company.logo_url || '',
        });

        let addr = address;

        if (!addr) {
            const { data } = await supabase
                .from('company_addresses')
                .select('*')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            addr = data ?? null;
            setAddress(addr);
        }

        if (addr) {
            setFormAddress({
                address_type: addr.address_type || 'head_office',
                address_name: addr.address_name || '',
                house_no: addr.house_no || '',
                moo: addr.moo || '',
                building: addr.building || '',
                floor: addr.floor || '',
                village: addr.village || '',
                alley: addr.alley || '',
                road: addr.road || '',
                subdistrict: addr.subdistrict || '',
                district: addr.district || '',
                province: addr.province || '',
                postal_code: addr.postal_code || '',
                country: addr.country || 'ไทย',
                contact_name: addr.contact_name || '',
                phone_mobile: addr.phone_mobile || '',
                phone: addr.phone || '',
                email: addr.email || '',
                website: addr.website || '',
                latitude: addr.latitude != null ? String(addr.latitude) : '',
                longitude: addr.longitude != null ? String(addr.longitude) : '',
                radius_meters: addr.radius_meters != null ? String(addr.radius_meters) : '',
            });

            if (addr.latitude != null && addr.longitude != null) {
                const lat = Number(addr.latitude);
                const lng = Number(addr.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    setPreviewPos({ lat, lng });
                    setMapCenter([lat, lng]);
                }
            }
        } else {
            setPreviewPos(null);
            setMapCenter([13.756331, 100.501762]);
        }

        setLogoPreview(company.logo_url || '');
        setFormTab(0);
        setOpenModal(true);
    };

    const handleCloseModal = () => setOpenModal(false);

    // helpers for numeric text inputs
    const cleanDigits = (v) => v.replace(/[^0-9]/g, '');
    const cleanDecimal = (v) => {
        // allow digits, one leading '-', and one '.' with up to 6 decimals
        let s = v.replace(/[^0-9.\-]/g, '');
        // keep only first '-'
        const minusIdx = s.indexOf('-');
        if (minusIdx > 0) s = s.replace(/-/g, '');
        if (minusIdx === 0) s = '-' + s.slice(1).replace(/-/g, '');
        // keep only first '.'
        const firstDot = s.indexOf('.');
        if (firstDot !== -1) {
            const intPart = s.slice(0, firstDot + 1);
            const fracPart = s.slice(firstDot + 1).replace(/\./g, '');
            s = intPart + fracPart.slice(0, 6); // DECIMAL(10,6) → scale 6
        }
        return s;
    };

    // const Alert = React.forwardRef(function Alert(props, ref) {
    //     return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
    // });

    const handleSave = async () => {
        const newErrors = {};

        // ===== Validate Company (ตัวอย่างเดิม) =====
        if (!formCompany.company_code) {
            newErrors.company_code = "กรุณากรอกรหัสบริษัท";
        } else if (formCompany.company_code.length > 20) {
            newErrors.company_code = "รหัสบริษัทต้องไม่เกิน 20 ตัว";
        }

        if (!formCompany.name_th) {
            newErrors.name_th = "กรุณากรอกชื่อบริษัท (ไทย)";
        } else if (formCompany.name_th.length > 255) {
            newErrors.name_th = "ชื่อบริษัท (ไทย) ต้องไม่เกิน 255 ตัว";
        }

        if (formCompany.name_en && formCompany.name_en.length > 255) {
            newErrors.name_en = "ชื่อบริษัท (อังกฤษ) ต้องไม่เกิน 255 ตัว";
        }

        if (formCompany.branch_tax_no.length > 13) {
            newErrors.branch_tax_no = "เลขที่สาขาผู้เสียภาษีต้องไม่เกิน 13 ตัว";
        }

        if (formCompany.tax_id.length > 13) {
            newErrors.tax_id = "เลขประจำตัวผู้เสียภาษีต้องไม่เกิน 13 ตัว";
        }

        // required fields
        if (!formAddress.address_name) newErrors.address_name = 'กรุณากรอกชื่อที่อยู่';
        if (!formAddress.house_no) newErrors.house_no = 'กรุณากรอกเลขที่';
        if (!formAddress.subdistrict) newErrors.subdistrict = 'กรุณากรอกตำบล/แขวง';
        if (!formAddress.district) newErrors.district = 'กรุณากรอกอำเภอ/เขต';
        if (!formAddress.province) newErrors.province = 'กรุณากรอกจังหวัด';
        if (!formAddress.postal_code) newErrors.postal_code = 'กรุณากรอกรหัสไปรษณีย์';

        // length checks per schema
        if (formAddress.house_no && formAddress.house_no.length > 5) newErrors.house_no = 'เลขที่ต้องไม่เกิน 5 ตัว';
        if (formAddress.moo && formAddress.moo.length > 5) newErrors.moo = 'หมู่ที่ต้องไม่เกิน 5 ตัว';
        if (formAddress.building && formAddress.building.length > 100) newErrors.building = 'อาคารต้องไม่เกิน 100 ตัว';
        if (formAddress.floor && formAddress.floor.length > 5) newErrors.floor = 'ชั้นต้องไม่เกิน 5 ตัว';
        if (formAddress.village && formAddress.village.length > 100) newErrors.village = 'หมู่บ้านต้องไม่เกิน 100 ตัว';
        if (formAddress.alley && formAddress.alley.length > 100) newErrors.alley = 'ตรอก/ซอยต้องไม่เกิน 100 ตัว';
        if (formAddress.road && formAddress.road.length > 100) newErrors.road = 'ถนนต้องไม่เกิน 100 ตัว';
        if (formAddress.country && formAddress.country.length > 100) newErrors.country = 'ประเทศต้องไม่เกิน 100 ตัว';
        if (formAddress.province && formAddress.province.length > 100) newErrors.province = 'จังหวัดต้องไม่เกิน 100 ตัว';
        if (formAddress.district && formAddress.district.length > 100) newErrors.district = 'อำเภอ/เขตต้องไม่เกิน 100 ตัว';
        if (formAddress.subdistrict && formAddress.subdistrict.length > 100) newErrors.subdistrict = 'ตำบล/แขวงต้องไม่เกิน 100 ตัว';
        if (formAddress.postal_code && formAddress.postal_code.length > 10) newErrors.postal_code = 'รหัสไปรษณีย์ต้องไม่เกิน 10 ตัว';
        if (formAddress.contact_name && formAddress.contact_name.length > 100) newErrors.contact_name = 'ชื่อผู้ติดต่อต้องไม่เกิน 100 ตัว';
        if (formAddress.phone_mobile && formAddress.phone_mobile.length > 20) newErrors.phone_mobile = 'โทรศัพท์มือถือไม่เกิน 20 ตัว';
        if (formAddress.phone && formAddress.phone.length > 20) newErrors.phone = 'โทรศัพท์ไม่เกิน 20 ตัว';
        if (formAddress.website && formAddress.website.length > 255) newErrors.website = 'เว็บไซต์ต้องไม่เกิน 255 ตัว';

        // latitude / longitude range & scale (if provided)
        const lat = formAddress.latitude === '' ? null : Number(formAddress.latitude);
        const lng = formAddress.longitude === '' ? null : Number(formAddress.longitude);
        const tooManyLatDecimals = /(\.(\d{7,}))$/.test(String(formAddress.latitude || ''));
        const tooManyLngDecimals = /(\.(\d{7,}))$/.test(String(formAddress.longitude || ''));
        if (lat != null) {
            if (!Number.isFinite(lat) || lat < -90 || lat > 90) newErrors.latitude = 'ละติจูดต้องเป็นตัวเลขระหว่าง -90 ถึง 90';
            else if (tooManyLatDecimals) newErrors.latitude = 'ละติจูดต้องมีทศนิยมไม่เกิน 6 ตำแหน่ง';
        }
        if (lng != null) {
            if (!Number.isFinite(lng) || lng < -180 || lng > 180) newErrors.longitude = 'ลองจิจูดต้องเป็นตัวเลขระหว่าง -180 ถึง 180';
            else if (tooManyLngDecimals) newErrors.longitude = 'ลองจิจูดต้องมีทศนิยมไม่เกิน 6 ตำแหน่ง';
        }

        if (formAddress.radius_meters !== '') {
            const r = Number(formAddress.radius_meters);
            if (!Number.isInteger(r) || r < 0) newErrors.radius_meters = 'รัศมีต้องเป็นจำนวนเต็มไม่ติดลบ';
        }

        // ถ้ามี error อย่างน้อย 1 ช่อง -> set แล้ว return เลย
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setSnackbar({ open: true, message: 'กรุณากรอกข้อมูลให้ถูกต้องและครบถ้วน', severity: 'error' });
            return;
        }

        // เตรียมข้อมูลบริษัท (ยังไม่ใส่โลโก้จาก blob://)
        // เหตุผล: อัปโหลดรูปจริงขึ้น Storage แล้วค่อยอัปเดต URL ลงฐานข้อมูล
        const savedCompany = {
            ...formCompany,
            established_date: formCompany.established_date || null,
            logo_url: formCompany.logo_url && !String(formCompany.logo_url).startsWith('blob:')
                ? formCompany.logo_url
                : null,
        };

        const savedAddress = {
            ...formAddress,
            latitude: formAddress.latitude !== '' ? Number(formAddress.latitude) : null,
            longitude: formAddress.longitude !== '' ? Number(formAddress.longitude) : null,
            radius_meters: formAddress.radius_meters !== '' ? Number(formAddress.radius_meters) : 0,
        };

    setSaving(true);
    try {
            // ลบไฟล์เก่าถ้าผู้ใช้เปลี่ยนรูปหรือกดล้างรูป (ทำเฉพาะตอนแก้ไข)
            const oldLogoUrl = company?.logo_url || null;
            const isClearLogo = !logoFile && (!formCompany.logo_url || String(formCompany.logo_url).trim() === '');
            if (editMode && oldLogoUrl && (logoFile || isClearLogo)) {
                await deleteCompanyLogoFromStorage(oldLogoUrl);
            }

            let companyData = company;

            if (editMode && company) {
                const { data, error } = await supabase
                    .from('company')
                    .update(savedCompany)
                    .eq('id', company.id)
                    .select()
                    .single();
                if (error) throw error;
                companyData = data;
            } else {
                const { data, error } = await supabase
                    .from('company')
                    .insert([savedCompany])
                    .select()
                    .single();
                if (error) throw error;
                companyData = data;
            }

            // === อัปโหลดรูปโลโก้ขึ้น Supabase Storage แล้วอัปเดต URL ===
            if (logoFile) {
                try {
                    const publicUrl = await uploadCompanyLogoToStorage(logoFile, companyData.id);
                    const { data: updated, error: logoUpdateErr } = await supabase
                        .from('company')
                        .update({ logo_url: publicUrl })
                        .eq('id', companyData.id)
                        .select()
                        .single();
                    if (logoUpdateErr) throw logoUpdateErr;
                    companyData = updated; // อัปเดตค่าใน state
                } catch (uploadErr) {
                    console.error('Logo upload/update error:', uploadErr.message);
                }
            }

            let addressData = address;
            if (editMode) {
                if (address) {
                    const { data, error } = await supabase
                        .from('company_addresses')
                        .update(savedAddress)
                        .eq('id', address.id)
                        .select()
                        .single();
                    if (error) throw error;
                    addressData = data;
                } else {
                    const { data, error } = await supabase
                        .from('company_addresses')
                        .insert([{ ...savedAddress, company_id: companyData.id }])
                        .select()
                        .single();
                    if (error) throw error;
                    addressData = data;
                }
            } else {
                const { data, error } = await supabase
                    .from('company_addresses')
                    .insert([{ ...savedAddress, company_id: companyData.id }])
                    .select()
                    .single();
                if (error) throw error;
                addressData = data;
            }

            setCompany(companyData);
            setAddress(addressData);
            setOpenModal(false);
            setSnackbar({ open: true, message: 'บันทึกสำเร็จ', severity: 'success' }); // แจ้งเตือนเมื่อบันทึกสำเร็จ
        } catch (err) {
            // แสดงเฉพาะใน console ตามข้อกำหนด (ไม่ใช้ alert)
            console.error('Error saving company:', err.message);
            // ถ้าต้องการ map error ไปที่ฟิลด์เฉพาะ สามารถเพิ่มได้ในอนาคต
        } finally {
            setSaving(false);
        }
    };

    const handlePickLogo = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // แสดงตัวอย่างทันที แต่ยังไม่บันทึกลง DB จนกด "บันทึก"
        const url = URL.createObjectURL(file);
        if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
        setLogoFile(file);
        setLogoPreview(url);
        // เก็บไว้เฉย ๆ สำหรับเคสเดิม แต่จะไม่ใช้ blob:// ในการบันทึกจริง
        setFormCompany((s) => ({ ...s, logo_url: url }));
    };

    const handleClearLogo = () => {
        if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
        setLogoFile(null);
        setLogoPreview('');
        setFormCompany((s) => ({ ...s, logo_url: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const Item = styled(Paper)(({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
        ...theme.typography.body2,
        padding: theme.spacing(1),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    }));

    function FlyTo({ center, zoom = 16 }) {
        const map = useMap();
        React.useEffect(() => {
            if (center && Array.isArray(center)) map.flyTo(center, zoom, { duration: 0.6 });
        }, [center, zoom, map]);
        return null;
    }

    const usePinIcon = () =>
        React.useMemo(
            () =>
                L.divIcon({
                    className: 'custom-pin',
                    html:
                        '<div style="width:18px;height:18px;border-radius:50%;background:#1976d2;border:2px solid white;box-shadow:0 0 0 2px #1976d2"></div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9],
                }),
            []
        );

    function useEnsureLeafletCss(shouldAttach) {
        React.useEffect(() => {
            if (!shouldAttach) return;
            const id = 'leaflet-css-cdn';
            const exists = document.getElementById(id);
            if (!exists) {
                const link = document.createElement('link');
                link.id = id;
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }
        }, [shouldAttach]);
    }

    const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };

    const handlePreviewPin = () => {
        const lat = toNum(formAddress.latitude);
        const lng = toNum(formAddress.longitude);
        const fallback = [13.756331, 100.501762];

        if (lat == null || lng == null) {
            setPreviewPos(null);
            setMapCenter(fallback);
            return;
        }

        const pos = { lat, lng };
        setPreviewPos(pos);
        setMapCenter([lat, lng]);
    };

    function MapBox({ open, tab, center, previewPos, radiusMeters, mapRef }) {
        useEnsureLeafletCss(open && tab === 1);
        const pinIcon = usePinIcon();
        const isClient = typeof window !== 'undefined';

        return (
            <Box sx={{ width: '100%', height: 380, mt: 3, display: 'flex', justifyContent: 'center', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                {!isClient ? null : (
                    <Box sx={{ width: '100%', height: '100%' }}>
                        <MapContainer
                            center={center}
                            zoom={20}
                            scrollWheelZoom
                            style={{ width: '100%', height: '100%' }}
                            whenCreated={(map) => (mapRef.current = map)}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                            <FlyTo center={center} zoom={16} />
                            {previewPos && (
                                <>
                                    <Marker position={[previewPos.lat, previewPos.lng]} icon={pinIcon} />
                                    {radiusMeters > 0 && <Circle center={[previewPos.lat, previewPos.lng]} radius={radiusMeters} pathOptions={{ fillOpacity: 0.15 }} />}
                                </>
                            )}
                        </MapContainer>
                    </Box>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 'bold' }} variant="h6">ข้อมูลบริษัท</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    {address && <Chip label={address.address_type === 'head_office' ? 'สำนักงานใหญ่' : 'สาขา'} size="small" />}
                    {company ? (
                        <Button startIcon={<EditOutlinedIcon />} variant="contained" onClick={handleOpenEdit}>แก้ไข</Button>
                    ) : (
                        <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={handleOpenAdd}>เพิ่ม</Button>
                    )}
                </Stack>
            </Stack>

            <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <NoFocusTab label="ข้อมูลทั่วไป" />
                    <NoFocusTab label="ที่อยู่" />
                </Tabs>

                {tab === 0 && (
                    <Box>
                        {company ? (
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
                                <Box sx={{ width: { xs: '100%', md: 280, lg: 320 }, aspectRatio: '1 / 1', flexShrink: 0, bgcolor: 'action.hover', borderRadius: 1, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {company.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img alt="logo" src={company.logo_url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <Typography variant="h5" sx={{ color: 'text.disabled' }}>รูปโลโก้</Typography>
                                    )}
                                </Box>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Grid container spacing={{ xs: 2.5, md: 3 }}>
                                        <Grid item xs={12} md={6}>
                                            <FieldItem label="รหัสบริษัท" value={displayValue(company.company_code)} />
                                            <FieldItem label="ชื่อบริษัท" value={displayValue(company.name_th)} />
                                            <FieldItem label="ชื่อบริษัท (Eng)" value={displayValue(company.name_en)} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <FieldItem label="เลขที่สาขาผู้เสียภาษี" value={displayValue(company.branch_tax_no)} />
                                            <FieldItem label="เลขประจำตัวผู้เสียภาษี" value={displayValue(company.tax_id)} />
                                            <FieldItem
                                                label="วันที่ก่อตั้งบริษัท"
                                                value={displayValue(formatDateTH(company.established_date))}
                                            />
                                        </Grid>
                                    </Grid>

                                </Box>
                            </Stack>
                        ) : (
                            <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
                                ยังไม่มีข้อมูลบริษัท
                            </Typography>
                        )}
                    </Box>
                )}

                {tab === 1 && (
                    <Box>
                        {address ? (
                            <Box>
                                <Section icon={<HomeWorkOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />} title="ที่อยู่">
                                    <Grid container spacing={{ xs: 2.5, md: 3 }}>
                                        {[
                                            { label: "ชื่อที่อยู่", value: address.address_name },
                                            { label: "เลขที่", value: address.house_no },
                                            { label: "หมู่ที่", value: address.moo },
                                            { label: "อาคาร", value: address.building },
                                            { label: "ชั้น", value: address.floor },
                                            { label: "หมู่บ้าน", value: address.village },
                                            { label: "ตรอก/ซอย", value: address.alley },
                                            { label: "ถนน", value: address.road },
                                            { label: "ตำบล/แขวง", value: address.subdistrict },
                                            { label: "อำเภอ/เขต", value: address.district },
                                            { label: "จังหวัด", value: address.province },
                                            { label: "รหัสไปรษณีย์", value: address.postal_code },
                                            { label: "ประเทศ", value: address.country },
                                        ].map((f) => (
                                            <Grid key={f.label} item xs={12} sm={12} md={6} lg={3}>
                                                <FieldItem label={f.label} value={f.value || "-"} />
                                            </Grid>
                                        ))}
                                    </Grid>

                                </Section>

                                <Section icon={<ContactsOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />} title="ผู้ติดต่อ">
                                    <Grid container spacing={{ xs: 2.5, md: 3 }} columns={{ xs: 12, sm: 12, md: 20, lg: 20 }}>
                                        {[
                                            { label: "ชื่อผู้ติดต่อ", value: address.contact_name },
                                            { label: "โทรศัพท์มือถือ", value: address.phone_mobile },
                                            { label: "โทรศัพท์", value: address.phone },
                                            { label: "เว็บไซต์", value: address.website },
                                        ].map((f) => (
                                            <Grid key={f.label} item xs={12} sm={12} md={4} lg={4}>
                                                <FieldItem label={f.label} value={f.value || "-"} />
                                            </Grid>
                                        ))}
                                    </Grid>

                                </Section>

                                <Section icon={<MyLocationOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />} title="พิกัด">
                                    <Grid container spacing={{ xs: 2.5, md: 3 }}>
                                        <Grid item xs={12} sm={12} md={6}>
                                            <FieldItem
                                                label="ละติจูด / ลองจิจูด"
                                                value={
                                                    address.latitude != null && address.longitude != null
                                                        ? `${Number(address.latitude).toFixed(6)}, ${Number(address.longitude).toFixed(6)}`
                                                        : '-'
                                                }
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={12} md={6}>
                                            <FieldItem label="รัศมี (เมตร)" value={address.radius_meters ?? 0} />
                                        </Grid>
                                    </Grid>
                                </Section>

                                {address.latitude != null && address.longitude != null && (
                                    <MapBox
                                        open={openModal}
                                        tab={tab}
                                        center={[Number(address.latitude), Number(address.longitude)]}
                                        previewPos={{
                                            lat: Number(address.latitude),
                                            lng: Number(address.longitude)
                                        }}
                                        radiusMeters={Number(address.radius_meters) || 0}
                                        mapRef={mapRef}
                                    />
                                )}


                            </Box>
                        ) : (
                            <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
                                ยังไม่มีที่อยู่
                            </Typography>
                        )}
                    </Box>
                )}
            </Paper>

            <Dialog
                open={openModal}
                onClose={(event, reason) => {
                    if (saving) return; // ป้องกันปิดระหว่างกำลังบันทึก
                    handleCloseModal();
                }}
                disableEscapeKeyDown={saving}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>{editMode ? 'แก้ไขข้อมูลบริษัท' : 'เพิ่มข้อมูลบริษัท'}</DialogTitle>
                <DialogContent dividers>
                    <Tabs value={formTab} onChange={(_, v) => setFormTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <NoFocusTab label="ข้อมูลทั่วไป" />
                        <NoFocusTab label="ที่อยู่" />
                    </Tabs>

                    {formTab === 0 && (
                        <Stack alignItems="center" spacing={2}>
                            <Box sx={{ width: 180, aspectRatio: '1 / 1', bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {logoPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>ตัวอย่างโลโก้</Typography>
                                )}
                            </Box>

                            <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 520 }}>
                                <Stack direction="row" spacing={1} justifyContent="center">
                                    <Button startIcon={<UploadFileIcon />} variant="outlined" component="label">
                                        เลือกไฟล์รูปภาพ
                                        <input ref={fileInputRef} hidden type="file" accept="image/*" onChange={handlePickLogo} />
                                    </Button>
                                    {logoPreview && (
                                        <Button startIcon={<DeleteOutlineIcon />} color="error" variant="text" onClick={handleClearLogo}>
                                            ล้างรูป
                                        </Button>
                                    )}
                                </Stack>
                                <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                                    รองรับไฟล์ภาพทั่วไป (PNG/JPG/SVG) • แสดงตัวอย่างทันที
                                </Typography>
                            </Stack>

                            <Box sx={{ width: '100%', mt: 1, display: 'flex', justifyContent: 'center' }}>
                                <Grid container spacing={3} sx={{ maxWidth: 900 }}>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            required
                                            fullWidth
                                            label="รหัสบริษัท"
                                            value={formCompany.company_code}
                                            onChange={(e) => setFormCompany((s) => ({ ...s, company_code: e.target.value }))}
                                            error={Boolean(errors.company_code)}
                                            helperText={errors.company_code}
                                            inputProps={{ maxLength: 20 }}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            required
                                            fullWidth
                                            label="ชื่อบริษัท (ไทย)"
                                            value={formCompany.name_th}
                                            onChange={(e) => setFormCompany((s) => ({ ...s, name_th: e.target.value }))}
                                            error={Boolean(errors.name_th)}
                                            helperText={errors.name_th}
                                            inputProps={{ maxLength: 255 }}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="ชื่อบริษัท (อังกฤษ)"
                                            value={formCompany.name_en}
                                            onChange={(e) => setFormCompany((s) => ({ ...s, name_en: e.target.value }))}
                                            error={Boolean(errors.name_en)}
                                            helperText={errors.name_en}
                                            inputProps={{ maxLength: 255 }}
                                            size="small"
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Box sx={{ width: '100%', mt: 1, display: 'flex', justifyContent: 'center' }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="เลขที่สาขาผู้เสียภาษี"
                                            value={formCompany.branch_tax_no}
                                            onChange={(e) => {
                                                const onlyNums = e.target.value.replace(/[^0-9]/g, "");
                                                setFormCompany((s) => ({ ...s, branch_tax_no: onlyNums }));
                                            }}
                                            error={Boolean(errors.branch_tax_no)}
                                            helperText={errors.branch_tax_no}
                                            inputProps={{ maxLength: 13 }}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="เลขประจำตัวผู้เสียภาษี"
                                            value={formCompany.tax_id}
                                            onChange={(e) => {
                                                const onlyNums = e.target.value.replace(/[^0-9]/g, "");
                                                setFormCompany((s) => ({ ...s, tax_id: onlyNums }));
                                            }}
                                            error={Boolean(errors.tax_id)}
                                            helperText={errors.tax_id}
                                            inputProps={{ maxLength: 13 }}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            type="date"
                                            label="วันที่ก่อตั้งบริษัท"
                                            value={formCompany.established_date || ""}
                                            InputLabelProps={{ shrink: true }}
                                            onChange={(e) =>
                                                setFormCompany((s) => ({ ...s, established_date: e.target.value }))
                                            }
                                            sx={{ width: 225 }}
                                            size="small"
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Stack>
                    )}

                    {formTab === 1 && (
                        <Stack alignItems="center" spacing={3}>
                            <Box
                                sx={{
                                    width: {
                                        xs: '100%',
                                        sm: '90%',
                                        md: '84%',
                                        lg: '84%',
                                        xl: '84%',
                                    },
                                    mt: 1,
                                    display: 'flex',
                                    justifyContent: 'left',
                                }}
                            >
                                <TextField
                                    required
                                    label="ชื่อที่อยู่"
                                    value={formAddress.address_name}
                                    onChange={(e) => setFormAddress((s) => ({ ...s, address_name: e.target.value }))}
                                    fullWidth
                                    error={Boolean(errors.address_name)}
                                    helperText={errors.address_name}
                                    sx={{
                                        display: 'block',
                                        width: {
                                            xs: '84%',
                                            sm: '90%',
                                            md: '84%',
                                            lg: '100%',
                                            xl: '100%',
                                        },
                                    }}
                                    size="small"
                                />
                            </Box>

                            <Box sx={{ width: '100%', mt: 1, display: 'flex', justifyContent: 'center' }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={12}>
                                        <TextField
                                            required
                                            fullWidth
                                            label="เลขที่"
                                            value={formAddress.house_no}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, house_no: e.target.value }))
                                            }
                                            inputProps={{ maxLength: 5 }}
                                            error={Boolean(errors.house_no)}
                                            helperText={errors.house_no}
                                            size="small" // ✅ ปรับขนาดเล็ก
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="หมู่ที่"
                                            value={formAddress.moo}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, moo: cleanDigits(e.target.value) }))
                                            }
                                            inputProps={{ maxLength: 5, inputMode: "numeric" }}
                                            error={Boolean(errors.moo)}
                                            helperText={errors.moo}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="อาคาร"
                                            value={formAddress.building}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, building: e.target.value }))
                                            }
                                            inputProps={{ maxLength: 100 }}
                                            error={Boolean(errors.building)}
                                            helperText={errors.building}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="ชั้น"
                                            value={formAddress.floor}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, floor: e.target.value }))
                                            }
                                            inputProps={{ maxLength: 5 }}
                                            error={Boolean(errors.floor)}
                                            helperText={errors.floor}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                </Grid>
                            </Box>

                            <Box sx={{ width: '100%', mt: 1, display: 'flex', justifyContent: 'center' }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="หมู่บ้าน"
                                            value={formAddress.village}
                                            onChange={(e) => setFormAddress((s) => ({ ...s, village: e.target.value }))}
                                            inputProps={{ maxLength: 100 }}
                                            error={Boolean(errors.village)}
                                            helperText={errors.village}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="ตรอก/ซอย"
                                            value={formAddress.alley}
                                            onChange={(e) => setFormAddress((s) => ({ ...s, alley: e.target.value }))}
                                            inputProps={{ maxLength: 100 }}
                                            error={Boolean(errors.alley)}
                                            helperText={errors.alley}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="ถนน"
                                            value={formAddress.road}
                                            onChange={(e) => setFormAddress((s) => ({ ...s, road: e.target.value }))}
                                            inputProps={{ maxLength: 100 }}
                                            error={Boolean(errors.road)}
                                            helperText={errors.road}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            required
                                            fullWidth
                                            label="ตำบล/แขวง"
                                            value={formAddress.subdistrict}
                                            onChange={(e) => setFormAddress((s) => ({ ...s, subdistrict: e.target.value }))}
                                            inputProps={{ maxLength: 100 }}
                                            error={Boolean(errors.subdistrict)}
                                            helperText={errors.subdistrict}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                </Grid>
                            </Box>

                            <Box sx={{ width: '100%', mt: 1, display: 'flex', justifyContent: 'center' }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            required
                                            fullWidth
                                            label="อำเภอ/เขต"
                                            value={formAddress.district}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, district: e.target.value }))
                                            }
                                            inputProps={{ maxLength: 100 }}
                                            error={Boolean(errors.district)}
                                            helperText={errors.district}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            required
                                            fullWidth
                                            label="จังหวัด"
                                            value={formAddress.province}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, province: e.target.value }))
                                            }
                                            inputProps={{ maxLength: 100 }}
                                            error={Boolean(errors.province)}
                                            helperText={errors.province}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            required
                                            fullWidth
                                            label="รหัสไปรษณีย์"
                                            value={formAddress.postal_code}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, postal_code: cleanDigits(e.target.value) }))
                                            }
                                            inputProps={{ maxLength: 10, inputMode: "numeric" }}
                                            error={Boolean(errors.postal_code)}
                                            helperText={errors.postal_code}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="ประเทศ"
                                            value={formAddress.country}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, country: e.target.value }))
                                            }
                                            inputProps={{ maxLength: 100 }}
                                            error={Boolean(errors.country)}
                                            helperText={errors.country}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                </Grid>
                            </Box>

                            <Box sx={{ width: '100%', mt: 3, display: 'flex', justifyContent: 'center' }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="ชื่อผู้ติดต่อ"
                                            value={formAddress.contact_name}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, contact_name: e.target.value }))
                                            }
                                            inputProps={{ maxLength: 100 }}
                                            error={Boolean(errors.contact_name)}
                                            helperText={errors.contact_name}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="โทรศัพท์มือถือ"
                                            value={formAddress.phone_mobile}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({
                                                    ...s,
                                                    phone_mobile: cleanDigits(e.target.value),
                                                }))
                                            }
                                            inputProps={{ maxLength: 20, inputMode: "numeric" }}
                                            error={Boolean(errors.phone_mobile)}
                                            helperText={errors.phone_mobile}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="โทรศัพท์"
                                            value={formAddress.phone}
                                            onChange={(e) =>
                                                setFormAddress((s) => ({ ...s, phone: cleanDigits(e.target.value) }))
                                            }
                                            inputProps={{ maxLength: 20, inputMode: "numeric" }}
                                            error={Boolean(errors.phone)}
                                            helperText={errors.phone}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="เว็บไซต์"
                                            value={formAddress.website}
                                            onChange={(e) => setFormAddress((s) => ({ ...s, website: e.target.value }))}
                                            inputProps={{ maxLength: 255 }}
                                            error={Boolean(errors.website)}
                                            helperText={errors.website}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                </Grid>
                            </Box>

                            <Box sx={{ width: '100%', mt: 3, display: 'flex', justifyContent: 'center' }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="ละติจูด"
                                            value={formAddress.latitude}
                                            placeholder="เช่น 13.756331"
                                            onChange={(e) =>
                                                setFormAddress((s) => ({
                                                    ...s,
                                                    latitude: cleanDecimal(e.target.value),
                                                }))
                                            }
                                            inputProps={{ inputMode: "decimal" }}
                                            error={Boolean(errors.latitude)}
                                            helperText={errors.latitude}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="ลองจิจูด"
                                            value={formAddress.longitude}
                                            placeholder="เช่น 100.501762"
                                            onChange={(e) =>
                                                setFormAddress((s) => ({
                                                    ...s,
                                                    longitude: cleanDecimal(e.target.value),
                                                }))
                                            }
                                            inputProps={{ inputMode: "decimal" }}
                                            error={Boolean(errors.longitude)}
                                            helperText={errors.longitude}
                                            size="small" // ✅
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            label="รัศมี (เมตร)"
                                            value={formAddress.radius_meters}
                                            placeholder="เช่น 250"
                                            onChange={(e) =>
                                                setFormAddress((s) => ({
                                                    ...s,
                                                    radius_meters: cleanDigits(e.target.value),
                                                }))
                                            }
                                            inputProps={{ maxLength: 3, inputMode: "numeric" }}
                                            error={Boolean(errors.radius_meters)}
                                            helperText={errors.radius_meters}
                                            size="small" // ✅
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={3} sx={{ height: '56px', display: 'block', width: '220px' }}>
                                        {/* <Button
                                            variant="contained"
                                            fullWidth
                                            sx={{ height: '56px', display: 'block', width: '220px' }}
                                            onClick={handlePreviewPin}
                                        >
                                            Preview ปักหมุด
                                        </Button> */}
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* <MapBox
                                open={openModal}
                                tab={formTab}
                                center={mapCenter}
                                previewPos={previewPos}
                                radiusMeters={toNum(formAddress.radius_meters) || 0}
                                mapRef={mapRef}
                            /> */}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal} color="inherit" disabled={saving}>ยกเลิก</Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving}>
                        {saving ? (
                            <>
                                <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                                กำลังบันทึก...
                            </>
                        ) : (
                            'บันทึก'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar แจ้งเตือน */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
