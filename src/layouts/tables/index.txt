import React, { useState } from "react";
import axios from "axios";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import { saveAs } from "file-saver";

function Tables() {
  const [repoUrl, setRepoUrl] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [error, setError] = useState(null);

  const handleRepoUrlChange = (event) => {
    setRepoUrl(event.target.value);
  };

  const handleFetchMetrics = async () => {
    setError(null);

    const repoPath = repoUrl.replace("https://github.com/", "").replace(".git", "").split("/");
    if (repoPath.length !== 2) {
      setError("URL del repositorio no válida. Asegúrate de usar el formato correcto.");
      return;
    }

    const [owner, repo] = repoPath;

    try {
      const repoInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
      const defaultBranch = repoInfo.data.default_branch;

      const commits = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/commits?sha=${defaultBranch}&per_page=1`
      );
      const totalCommits = parseInt(commits.headers["link"].match(/page=(\d+)>; rel="last"/)[1]);

      const [forks, openIssues, contributorsCount, files] = await Promise.all([
        axios.get(`https://api.github.com/repos/${owner}/${repo}`),
        axios.get(`https://api.github.com/repos/${owner}/${repo}/issues?state=open`),
        fetchContributorsCount(owner, repo),
        axios.get(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
        ),
      ]);

      // Almacenar métricas obtenidas en el estado
      setMetrics((prevMetrics) => [
        ...prevMetrics,
        {
          repoUrl,
          forks_count: forks.data.forks_count,
          commits_count: totalCommits,
          open_issues_count: openIssues.data.length,
          contributors_count: contributorsCount,
          files_count: files.data.tree.length,
        },
      ]);
    } catch (err) {
      setError("Error al obtener las métricas. Verifique el enlace o intente más tarde.");
      console.error(err);
    }
  };

  const fetchContributorsCount = async (owner, repo) => {
    let page = 1;
    let contributorsCount = 0;

    while (true) {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=30&page=${page}`
      );

      contributorsCount += response.data.length;
      if (response.data.length < 30) break;

      page++;
    }

    return contributorsCount;
  };

  // Función para exportar a CSV
  const exportCSV = () => {
    const headers = "Repo URL,Forks,Commits,Open Issues,Contributors,Files\n";
    const rows = metrics
      .map(
        (metric) =>
          `${metric.repoUrl},${metric.forks_count},${metric.commits_count},${metric.open_issues_count},${metric.contributors_count},${metric.files_count}`
      )
      .join("\n");

    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "metrics.csv");
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="50vh"
      >
        <h1>Extracción de métricas de GitHub</h1>
        <MDInput
          label="URL del repositorio"
          placeholder="https://github.com/facebook/react.git"
          value={repoUrl}
          onChange={handleRepoUrlChange}
          fullWidth
          sx={{ mb: 2 }}
        />
        <MDButton variant="contained" color="primary" onClick={handleFetchMetrics}>
          Obtener métricas
        </MDButton>

        {error && (
          <MDBox mt={2} color="error">
            {error}
          </MDBox>
        )}

        {metrics.length > 0 && (
          <MDBox mt={3} style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ddd" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Repo URL</th>
                  <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Forks</th>
                  <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Commits</th>
                  <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Issues</th>
                  <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Contribuidores</th>
                  <th style={{ borderBottom: "1px solid #ddd", padding: "8px" }}>Files</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, index) => (
                  <tr key={index}>
                    <td style={{ padding: "8px" }}>{metric.repoUrl}</td>
                    <td style={{ padding: "8px" }}>{metric.forks_count}</td>
                    <td style={{ padding: "8px" }}>{metric.commits_count}</td>
                    <td style={{ padding: "8px" }}>{metric.open_issues_count}</td>
                    <td style={{ padding: "8px" }}>{metric.contributors_count}</td>
                    <td style={{ padding: "8px" }}>{metric.files_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MDBox>
        )}

        {/* Botón de exportar CSV siempre visible */}
        <MDButton variant="contained" color="secondary" onClick={exportCSV} sx={{ mt: 3 }}>
          Exportar CSV
        </MDButton>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Tables;
