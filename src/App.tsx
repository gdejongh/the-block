import { BrowserRouter, Route, Routes } from "react-router-dom";
import { BidsProvider } from "./bids";
import ListPage from "./pages/ListPage";
import DetailPage from "./pages/DetailPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BidsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/vehicles/:id" element={<DetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </BidsProvider>
  );
}
