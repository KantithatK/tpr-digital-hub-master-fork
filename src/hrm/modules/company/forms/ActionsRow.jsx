// src/hrm/modules/company/forms/ActionsRow.jsx
import * as React from "react";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

export default function ActionsRow({ onSave, onReset, loading, hideReset }) {
  return (
    <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 2 }}>
      {!hideReset && (
        <Tooltip title="รีเซ็ต">
          <Button color="inherit" startIcon={<RestartAltIcon />} onClick={onReset}>
            รีเซ็ต
          </Button>
        </Tooltip>
      )}
      <Tooltip title="บันทึก">
        <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={onSave} disabled={!!loading}>
          บันทึก
        </Button>
      </Tooltip>
    </Stack>
  );
}
