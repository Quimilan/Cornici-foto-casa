import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Studio from "@/pages/Studio";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Studio />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#1e2028",
            border: "1px solid #2e323d",
            color: "#f4f5f8",
          },
        }}
      />
    </div>
  );
}

export default App;
