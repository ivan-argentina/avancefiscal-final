import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stack,
} from "@mui/material";

export default function ProgresoImportacion({ progreso, mensaje }) {
  return (
    <Card sx={{ mt: 4, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold">
          Importando datos...
        </Typography>

        <LinearProgress
          variant="determinate"
          value={progreso}
          sx={{
            mt: 2,
            height: 12,
            borderRadius: 10,
          }}
        />

        <Typography sx={{ mt: 2 }}>{mensaje}</Typography>
      </CardContent>
    </Card>
  );
}
