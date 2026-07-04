import { Card, CardContent, Typography } from "@mui/material";

export default function TarjetaResumenImportacion({
  titulo,
  valor,
  color = "primary.main",
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        textAlign: "center",
        height: "100%",
      }}
    >
      <CardContent>
        <Typography variant="h4" fontWeight="bold" color={color}>
          {valor}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {titulo}
        </Typography>
      </CardContent>
    </Card>
  );
}
