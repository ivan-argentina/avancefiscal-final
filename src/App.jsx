import InicioFactu from "./pages/InicioFactu";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Login from "./pages/Login";

import { BrowserRouter, Routes, Route } from "react-router-dom";

const theme = createTheme({
  typography: {
    fontSize: 12,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Routes>
        {/*Login */}
        <Route path="/" element={<Login />} />

        {/*Sistema*/}
        <Route path="/*" element={<InicioFactu />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
