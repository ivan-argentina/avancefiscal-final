import InicioFactu from "./pages/InicioFactu";
import CambiarPassword from "./pages/CambiarPassword";
import Login from "./pages/Login";
import Landing from "./landing/Landing";

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
        {/* Login */}
        <Route path="/" element={<Landing />} />

        {/* Landing (solo desarrollo por ahora) */}
        <Route path="/landing" element={<Landing />} />

        {/* Recuperar contraseña */}
        <Route path="/restablecer-password" element={<CambiarPassword />} />

        {/* Todo el sistema */}
        <Route path="/*" element={<InicioFactu />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
