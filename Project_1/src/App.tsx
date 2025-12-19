import { BrowserRouter } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import "./index.css";

export function App() {
  return (
    <BrowserRouter>
      <DashboardLayout />
    </BrowserRouter>
  );
}

export default App;
