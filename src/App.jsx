import InicioFactu from "./pages/InicioFactu";
import CambiarPassword from "./pages/CambiarPassword";
import Login from "./pages/Login";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Routes, Route } from "react-router-dom";

const theme = createTheme({
  typography: {
    fontSize: 12,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Login />} />

        <Route path="/restablecer-password" element={<CambiarPassword />} />

        {/* Sistema */}
        <Route path="/*" element={<InicioFactu />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
