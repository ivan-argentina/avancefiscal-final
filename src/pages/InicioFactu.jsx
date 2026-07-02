import { Navigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  Box,
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import AbmClientes from "./AbmClientes";
import AbmCiudades from "./AbmCiudades";
import AbmArticulos from "./AbmArticulos";
import FrmFamilias from "./AbmFamilias";
import Factura from "./Factura";
import Facturas from "./Facturas";
import ResumenClientes from "./ResumenClientes";
import { useEffect, useState } from "react";
import ResumenCliente from "./ResumenClientes";
import ResumenProveedores from "./ResumenProveedores";
import AbmProveedores from "./AbmProveedores";
import Compra from "./Compra";
import { useNavigate } from "react-router-dom";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import AbmEmpresas from "./AbmEmpresas";
import AbmUsuarios from "./AbmUsuarios";
import ImportarDatos from "./ImportarDatos";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import Dashboard from "./Dashboard";
import { supabase } from "../hook/supabaseClient";

const drawerWidth = 200;

export default function InicioFactu() {
  const location = useLocation();
  const [openReportes, setOpenReportes] = useState(false);
  const [openResumen, setOpenResumen] = useState(false);
  const [openArchivo, setOpenArchivo] = useState(false);
  const [openProveedores, setOpenProveedores] = useState(false);
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");

  const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
  const esSuperAdmin = usuarioGuardado?.rol_global === "superadmin";

  const navigate = useNavigate();

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");

    navigate("/");
  };

  useEffect(() => {
    const validarSesion = async () => {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

      if (!usuarioGuardado?.id) {
        navigate("/");
        return;
      }

      setNombreUsuario(usuarioGuardado.nombre || "Usuario");

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("empresas")
        .select("razon_social")
        .eq("id", idEmpresa)
        .maybeSingle();

      if (error) {
        console.log("error Empresa", error);
      }

      setEmpresaNombre(data?.razon_social || "");
    };

    validarSesion();
  }, [navigate]);

  useEffect(() => {
    if (location.pathname.includes("/facturas")) {
      setOpenReportes(true);
    }

    if (
      location.pathname.includes("/resumen-clientes") ||
      location.pathname.includes("/resumen-proveedores")
    ) {
      setOpenResumen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.includes("/facturas")) {
      setOpenReportes(true);
    }
  }, [location.pathname]);

  const menuItems = [{ text: "Factura", path: "/factura" }];

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Drawer
        variant="permanent"
        sx={{
          display: "flex",
          flexDirection: "column",
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            background: "linear-gradient(180deg, #1976d2, #0d47a1)",
            color: "white",
          },
        }}
      >
        <List
          sx={{
            flex: 1,
            overflowY: "auto",
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: "1px solid rgba(255,255,255,0.15)",
              mb: 1,
            }}
          >
            <Box
              sx={{
                fontWeight: "bold",
                fontSize: 18,
              }}
            >
              Gestión
            </Box>

            <Box
              sx={{
                fontSize: 13,
                opacity: 0.9,
                mt: 1,
              }}
            >
              {empresaNombre}
            </Box>
            {esSuperAdmin && (
              <>
                <ListItemButton
                  component={Link}
                  to="/empresas"
                  selected={location.pathname === "/empresas"}
                  sx={{ color: "white" }}
                >
                  <ListItemText primary="Empresas" />
                </ListItemButton>
                <ListItemButton
                  component={Link}
                  to="/usuarios"
                  selected={location.pathname === "/usuarios"}
                  sx={{ color: "white" }}
                >
                  <ListItemText primary="Usuarios" />
                </ListItemButton>
              </>
            )}

            <Box
              sx={{
                fontSize: 11,
                opacity: 0.7,
              }}
            >
              {nombreUsuario}
            </Box>
          </Box>
          {/* Dashboard */}
          <ListItemButton
            component={Link}
            to="/dashboard"
            selected={location.pathname === "/dashboard"}
            sx={{
              color: "white",
              transition: "all 0.25s ease",
              position: "relative",

              "&::before": {
                content: '""',
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: "4px",
                backgroundColor: "transparent",
                transition: "all 0.25s ease",
              },

              "&:hover::before": {
                backgroundColor: "#fff",
              },

              "&:hover": {
                backgroundColor: "#1565c0",
                transform: "translateX(6px)",
              },

              "&.Mui-selected": {
                backgroundColor: "#0d47a1",
              },
            }}
          >
            <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
              <DashboardIcon />
            </ListItemIcon>

            <ListItemText
              primary="Dashboard"
              primaryTypographyProps={{ color: "white" }}
            />
          </ListItemButton>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.text}
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                color: "white",
                transition: "all 0.25s ease",
                position: "relative",

                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: "4px",
                  backgroundColor: "transparent",
                  transition: "all 0.25s ease",
                },

                "&:hover::before": {
                  backgroundColor: "#fff",
                },

                "&:hover": {
                  backgroundColor: "#1565c0",
                  transform: "translateX(6px)",
                },

                "&.Mui-selected": {
                  backgroundColor: "#0d47a1",
                },
              }}
            >
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{ color: "white" }}
              />
            </ListItemButton>
          ))}
          {/* Proveedores */}
          <ListItemButton
            onClick={() => setOpenProveedores(!openProveedores)}
            sx={{ color: "white", mt: 1, position: "relative" }}
          >
            <ListItemText primary="Proveedores" />
            {openArchivo ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          {/* SubMenu Proveedores  */}
          <Collapse in={openProveedores} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                component={Link}
                to="/proveedores"
                selected={location.pathname === "/proveedores"}
                sx={{
                  pl: 4,
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                <ListItemText primary="A.B.M. Proveedores" />
              </ListItemButton>
            </List>
          </Collapse>
          {/* SubMenu Compra  */}
          <Collapse in={openProveedores} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                component={Link}
                to="/compra"
                selected={location.pathname === "/compra"}
                sx={{
                  pl: 4,
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                <ListItemText primary="Compra" />
              </ListItemButton>
            </List>
          </Collapse>

          {/* Archivos */}
          <ListItemButton
            onClick={() => setOpenArchivo(!openArchivo)}
            sx={{ color: "white", mt: 1, position: "relative" }}
          >
            <ListItemText primary="Archivos" />
            {openArchivo ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>

          {/* SubMenu articulos  */}
          <Collapse in={openArchivo} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                component={Link}
                to="/articulos"
                selected={location.pathname === "/articulos"}
                sx={{
                  pl: 4,
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                <ListItemText primary="Articulos" />
              </ListItemButton>
            </List>
          </Collapse>
          {/* SubMenu Clientes  */}
          <Collapse in={openArchivo} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                component={Link}
                to="/clientes"
                selected={location.pathname === "/articulos"}
                sx={{
                  pl: 4,
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                <ListItemText primary="Clientes" />
              </ListItemButton>
            </List>
          </Collapse>
          {/* SubMenu Ciudades  */}
          <Collapse in={openArchivo} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                component={Link}
                to="/ciudades"
                selected={location.pathname === "/ciudades"}
                sx={{
                  pl: 4,
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                <ListItemText primary="Ciudades" />
              </ListItemButton>
            </List>
          </Collapse>
          {/* SubMenu Familias  */}
          <Collapse in={openArchivo} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                component={Link}
                to="/familias"
                selected={location.pathname === "/familias"}
                sx={{
                  pl: 4,
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                <ListItemText primary="Familias" />
              </ListItemButton>
            </List>
          </Collapse>

          {/*Resumen */}
          <ListItemButton
            onClick={() => setOpenResumen(!openResumen)}
            sx={{
              color: "white",
              mt: 1,
              position: "relative",
            }}
          >
            <ListItemText primary="Resumen" />
            {openResumen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={openResumen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                component={Link}
                to="/resumen-clientes"
                selected={location.pathname === "/resumen-clientes"}
                sx={{
                  pl: 4,
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                <ListItemText primary="Clientes" />
              </ListItemButton>
              <ListItemButton
                component={Link}
                to="/resumen-proveedores"
                selected={location.pathname === "/resumen-proveedores"}
                sx={{
                  pl: 4,
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                <ListItemText primary="proveedores" />
              </ListItemButton>
            </List>
          </Collapse>
          {/* Reportes */}
          <ListItemButton
            onClick={() => setOpenReportes(!openReportes)}
            sx={{
              color: "white",
              mt: 1,
              position: "relative",
            }}
          >
            <ListItemText primary="Reportes" />
            {openReportes ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={openReportes} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                component={Link}
                to="/facturas"
                selected={location.pathname === "/facturas"}
                sx={{
                  pl: 4,
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                <ListItemText primary="Facturas" />
              </ListItemButton>
            </List>
          </Collapse>
        </List>

        <Box
          sx={{
            mt: "auto",
            p: 2,
            borderTop: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <ListItemButton
            component={Link}
            to="/importar-datos"
            selected={location.pathname === "/importar-datos"}
            sx={{
              color: "white",
              mb: 1,

              "&:hover": {
                backgroundColor: "#1565C0",
              },

              "&.Mui-selected": {
                backgroundColor: "#0D47A1",
              },
            }}
          >
            <ListItemText primary="Importar Datos" />
          </ListItemButton>
          <ListItemButton
            onClick={cerrarSesion}
            sx={{
              color: "white",

              //backgroundColor: "#1565C0",
              "&:hover": {
                backgroundColor: "#0D47A1",
              },
            }}
          >
            <ListItemText primary="Cerrar sesión" />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Contenido*/}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden", // 👈 clave
        }}
      >
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/factura" element={<Factura />} />
            <Route path="/clientes" element={<AbmClientes />} />
            <Route path="/ciudades" element={<AbmCiudades />} />
            <Route path="/articulos" element={<AbmArticulos />} />
            <Route path="/familias" element={<FrmFamilias />} />
            <Route path="/facturas" element={<Facturas />} />
            <Route path="/resumen-clientes" element={<ResumenClientes />} />
            <Route
              path="/resumen-proveedores"
              element={<ResumenProveedores />}
            />
            <Route path="/proveedores" element={<AbmProveedores />} />
            <Route path="/compra" element={<Compra />} />
            <Route path="/empresas" element={<AbmEmpresas />} />
            <Route path="/usuarios" element={<AbmUsuarios />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/importar-datos" element={<ImportarDatos />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}
