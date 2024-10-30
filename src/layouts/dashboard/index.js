import React, { useState } from "react";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import * as XLSX from "xlsx";

function Dashboard() {
  const [projectKey, setProjectKey] = useState("");
  const [token, setToken] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [projectKeys, setProjectKeys] = useState([]);

  const handleExtractMetrics = async (key) => {
    try {
      setError("");
      const response = await fetch(
        `http://localhost:4000/api/measures/component?projectKey=${key}&token=${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al obtener métricas");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSingleExtraction = async () => {
    const data = await handleExtractMetrics(projectKey);
    setMetrics(data);
  };

  const handleBulkExtraction = async () => {
    const metricsResults = [];

    for (const key of projectKeys) {
      const data = await handleExtractMetrics(key);
      if (data) {
        metricsResults.push({ key, metrics: data });
      }
    }
    setMetrics(metricsResults);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleFileUpload(selectedFile);
    }
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const keys = XLSX.utils.sheet_to_json(worksheet, { header: 1 }).map((row) => row[0]);
      setProjectKeys(keys);
      console.log(keys);
    };
    reader.readAsArrayBuffer(file);
  };

  const metricOrder = [
    "ncloc",
    "complexity",
    "cognitive_complexity",
    "classes",
    "functions",
    "duplicated_lines",
    "duplicated_blocks",
    "comment_lines",
    "class_complexity",
    "file_complexity",
    "comment_lines_density",
    "bugs",
  ];

  const exportToCSV = () => {
    const csvData = [];
    const header = ["Project Key", ...metricOrder];
    csvData.push(header);

    if (Array.isArray(metrics)) {
      metrics.forEach((result) => {
        const row = [result.key];
        metricOrder.forEach((metricName) => {
          const metricValue = result.metrics.component.measures.find(
            (m) => m.metric === metricName
          )?.value;
          row.push(metricValue || 0);
        });
        csvData.push(row);
      });
    } else {
      const row = [projectKey];
      metricOrder.forEach((metricName) => {
        const metricValue = metrics.component.measures.find((m) => m.metric === metricName)?.value;
        row.push(metricValue || 0);
      });
      csvData.push(row);
    }

    const blob = new Blob([csvData.map((e) => e.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "metrics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox display="flex" justifyContent="center" alignItems="center" height="50vh">
        <div>
          <h1>Extracción Métricas SonarQube</h1>
          <input
            type="text"
            placeholder="Clave del proyecto"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            style={{
              padding: "10px",
              margin: "10px 0",
              width: "100%",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
          <input
            type="text"
            placeholder="Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{
              padding: "10px",
              margin: "10px 0",
              width: "100%",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
          <button
            onClick={handleSingleExtraction}
            style={{
              ...buttonStyle,
              backgroundColor: "#007bff", // Azul para el primer botón
              margin: "20px 100px",
            }}
          >
            Extraer Métricas
          </button>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            style={{
              margin: "10px 0px",
              padding: "0px",
              height: "38px",
              width: "190px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              display: "inline-block",
            }}
          />
          <button
            onClick={handleBulkExtraction}
            style={{
              ...buttonStyle,
              backgroundColor: "#28a745", // Verde para el segundo botón
              marginTop: "10px",
            }}
          >
            Extraer Métricas Múltiples
          </button>
          <button
            onClick={exportToCSV}
            style={{
              ...buttonStyle,
              backgroundColor: "#dc3545", // Rojo para el tercer botón
              margin: "10px 200px",
            }}
          >
            Exportar a CSV
          </button>

          {error && <p style={{ color: "red" }}>{error}</p>}
          {metrics && (
            <div
              style={{
                overflowY: "auto",
                maxHeight: "300px",
                border: "1px solid #ddd",
                padding: "10px",
                marginTop: "20px",
              }}
            >
              {Array.isArray(metrics) ? (
                metrics.map((result) => (
                  <div key={result.key}>
                    <h3>Proyecto: {result.key}</h3>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        textAlign: "center",
                        fontSize: "0.9rem",
                      }}
                    >
                      <thead>
                        <tr>
                          {metricOrder.map((metric) => (
                            <th
                              key={metric}
                              style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                            >
                              {metric}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {metricOrder.map((metricName) => {
                            const metricValue = result.metrics.component.measures.find(
                              (m) => m.metric === metricName
                            )?.value;
                            return (
                              <td key={metricName} style={{ padding: "8px" }}>
                                {metricValue || 0}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <div>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "center",
                      fontSize: "0.9rem",
                    }}
                  >
                    <thead>
                      <tr>
                        {metricOrder.map((metric) => (
                          <th
                            key={metric}
                            style={{ borderBottom: "1px solid #ddd", padding: "8px" }}
                          >
                            {metric}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {metricOrder.map((metricName) => {
                          const metricValue = metrics.component.measures.find(
                            (m) => m.metric === metricName
                          )?.value;
                          return (
                            <td key={metricName} style={{ padding: "8px" }}>
                              {metricValue || 0}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

const buttonStyle = {
  padding: "10px 15px",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

export default Dashboard;
