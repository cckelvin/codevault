"use client";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [records, setRecords] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [code, setCode] = useState("");
  const [originalCode, setOriginalCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [showNewFile, setShowNewFile] = useState(false);
  const [newFile, setNewFile] = useState({
    project: "",
    folder: "/",
    name: "",
    code: "",
  });

  const [showGithub, setShowGithub] = useState(false);

  const projects = useMemo(() => {
    const names = records
      .map((record) => record.fields?.Project)
      .filter(Boolean);

    return [...new Set(names)];
  }, [records]);

  const projectFiles = useMemo(() => {
    if (!selectedProject) return [];

    return records
      .filter((record) => record.fields?.Project === selectedProject)
      .sort((a, b) => {
        const aPath = `${a.fields?.["File/Folder"] || "/"}${a.fields?.Name || ""}`;
        const bPath = `${b.fields?.["File/Folder"] || "/"}${b.fields?.Name || ""}`;

        return aPath.localeCompare(bPath);
      });
  }, [records, selectedProject]);

  async function loadCode() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/code", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load CodeVault.");
      }

      const loadedRecords = data.records || [];

      setRecords(loadedRecords);

      const projectNames = [
        ...new Set(
          loadedRecords
            .map((record) => record.fields?.Project)
            .filter(Boolean)
        ),
      ];

      if (projectNames.length > 0) {
        setSelectedProject((current) =>
          projectNames.includes(current) ? current : projectNames[0]
        );
      } else {
        setSelectedProject("");
        setSelectedFile(null);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCode();
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setSelectedFile(null);
      setCode("");
      setOriginalCode("");
      return;
    }

    const currentFileStillExists = projectFiles.some(
      (record) => record.id === selectedFile?.id
    );

    if (!currentFileStillExists) {
      const firstFile = projectFiles[0];

      setSelectedFile(firstFile || null);

      const firstCode = firstFile?.fields?.Code || "";

      setCode(firstCode);
      setOriginalCode(firstCode);
    }
  }, [selectedProject, projectFiles, selectedFile?.id]);

  function selectFile(record) {
    setSelectedFile(record);

    const nextCode = record.fields?.Code || "";

    setCode(nextCode);
    setOriginalCode(nextCode);
    setMessage("");
  }

  async function saveFile() {
    if (!selectedFile) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/code/${selectedFile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save file.");
      }

      setRecords((current) =>
        current.map((record) =>
          record.id === selectedFile.id
            ? {
                ...record,
                fields: {
                  ...record.fields,
                  Code: code,
                },
              }
            : record
        )
      );

      setOriginalCode(code);
      setSelectedFile((current) =>
        current
          ? {
              ...current,
              fields: {
                ...current.fields,
                Code: code,
              },
            }
          : current
      );

      setMessage("Saved to Airtable.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function createFile(event) {
    event.preventDefault();

    if (!newFile.project.trim()) {
      setMessage("Enter a project name.");
      return;
    }

    if (!newFile.name.trim()) {
      setMessage("Enter a file name.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: newFile.project.trim(),
          folder: newFile.folder.trim() || "/",
          name: newFile.name.trim(),
          code: newFile.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create file.");
      }

      const created = data.record;

      setRecords((current) => [...current, created]);
      setSelectedProject(created.fields?.Project || newFile.project.trim());
      setSelectedFile(created);
      setCode(created.fields?.Code || "");
      setOriginalCode(created.fields?.Code || "");

      setNewFile({
        project: newFile.project.trim(),
        folder: "/",
        name: "",
        code: "",
      });

      setShowNewFile(false);
      setMessage("File created.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  function handleProjectChange(project) {
    setSelectedProject(project);
    setSelectedFile(null);
    setCode("");
    setOriginalCode("");
    setMessage("");
  }

  const hasUnsavedChanges = code !== originalCode;

  const lineCount = Math.max(code.split("\n").length, 1);

  return (
    <main className="cv-shell">
      <header className="cv-topbar">
        <div className="cv-brand">
          <div className="cv-logo">CV</div>

          <div className="cv-brand-name">CodeVault</div>

          <div className="cv-status">
            <span className="cv-status-dot" />
            Connected
          </div>
        </div>

        <div className="cv-top-actions">
          <button
            className="cv-button"
            onClick={loadCode}
            disabled={loading}
          >
            ↻
            <span>Refresh</span>
          </button>

          <button
            className="cv-button"
            onClick={() => setShowNewFile(true)}
          >
            +
            <span>New File</span>
          </button>

          <button
            className="cv-button cv-button-primary"
            onClick={() => setShowGithub(true)}
            disabled={records.length === 0}
          >
            ↑
            <span>Push to GitHub</span>
          </button>
        </div>
      </header>

      <section className="cv-workspace">
        <aside className="cv-sidebar">
          <div className="cv-sidebar-header">
            <span className="cv-sidebar-title">Projects</span>

            <button
              className="cv-icon-button"
              title="New file"
              onClick={() => setShowNewFile(true)}
            >
              +
            </button>
          </div>

          <div className="cv-project-list">
            {loading ? (
              <div className="cv-empty">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="cv-empty">
                No projects found.
                <br />
                Create your first file.
              </div>
            ) : (
              projects.map((project) => {
                const isActive = project === selectedProject;

                const files = records
                  .filter(
                    (record) => record.fields?.Project === project
                  )
                  .sort((a, b) => {
                    const aPath = `${
                      a.fields?.["File/Folder"] || "/"
                    }${a.fields?.Name || ""}`;

                    const bPath = `${
                      b.fields?.["File/Folder"] || "/"
                    }${b.fields?.Name || ""}`;

                    return aPath.localeCompare(bPath);
                  });

                return (
                  <div className="cv-project" key={project}>
                    <button
                      className={`cv-project-header ${
                        isActive ? "active" : ""
                      }`}
                      onClick={() => handleProjectChange(project)}
                    >
                      <span className="cv-project-arrow">
                        {isActive ? "▾" : "▸"}
                      </span>

                      <span className="cv-project-icon">◆</span>

                      <span className="cv-project-name">
                        {project}
                      </span>
                    </button>

                    {isActive && (
                      <div className="cv-file-tree">
                        {files.map((record) => {
                          const isSelected =
                            selectedFile?.id === record.id;

                          const folder =
                            record.fields?.["File/Folder"] || "/";

                          const name =
                            record.fields?.Name || "Unnamed";

                          return (
                            <button
                              key={record.id}
                              className={`cv-tree-item ${
                                isSelected ? "active" : ""
                              }`}
                              onClick={() => selectFile(record)}
                              title={`${folder}${name}`}
                            >
                              <span className="cv-tree-icon">
                                {getFileIcon(name)}
                              </span>

                              <span className="cv-tree-name">
                                {name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="cv-editor">
          <div className="cv-editor-header">
            <div className="cv-editor-file">
              {selectedFile ? (
                <>
                  <span className="cv-editor-file-icon">
                    {getFileIcon(selectedFile.fields?.Name)}
                  </span>

                  <span className="cv-editor-file-name">
                    {selectedFile.fields?.["File/Folder"] || "/"}
                    {selectedFile.fields?.Name || "Unnamed"}
                  </span>

                  {hasUnsavedChanges && (
                    <span
                      className="cv-unsaved"
                      title="Unsaved changes"
                    />
                  )}
                </>
              ) : (
                <span className="cv-editor-file-name">
                  Select a file
                </span>
              )}
            </div>

            <div className="cv-editor-actions">
              <button
                className="cv-button cv-button-primary"
                onClick={saveFile}
                disabled={!selectedFile || !hasUnsavedChanges || saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div className="cv-editor-body">
            {selectedFile ? (
              <>
                <div className="cv-line-numbers">
                  {Array.from(
                    { length: lineCount },
                    (_, index) => (
                      <div key={index}>{index + 1}</div>
                    )
                  )}
                </div>

                <textarea
                  className="cv-code-input"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value)
                  }
                  spellCheck={false}
                  onKeyDown={(event) => {
                    if (event.key === "Tab") {
                      event.preventDefault();

                      const textarea = event.currentTarget;

                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;

                      const nextValue =
                        code.substring(0, start) +
                        "  " +
                        code.substring(end);

                      setCode(nextValue);

                      requestAnimationFrame(() => {
                        textarea.selectionStart = start + 2;
                        textarea.selectionEnd = start + 2;
                      });
                    }
                  }}
                />
              </>
            ) : (
              <div className="cv-empty">
                Select a file from the project tree to view and edit
                its code.
              </div>
            )}
          </div>

          <footer className="cv-statusbar">
            <div className="cv-status-left">
              <span>
                {selectedFile?.fields?.Name || "No file selected"}
              </span>

              <span>
                {selectedFile?.fields?.Code
                  ? `${selectedFile.fields.Code.length} characters`
                  : ""}
              </span>
            </div>

            <div className="cv-status-right">
              <span>
                {hasUnsavedChanges ? "Unsaved changes" : "Saved"}
              </span>

              <span>
                {selectedProject || "No project"}
              </span>
            </div>
          </footer>
        </section>
      </section>

      {message && (
        <div
          style={{
            position: "fixed",
            bottom: "42px",
            right: "16px",
            zIndex: 80,
          }}
        >
          <div
            className={`cv-message ${
              message.toLowerCase().includes("error") ||
              message.toLowerCase().includes("unable")
                ? "cv-message-error"
                : "cv-message-success"
            }`}
          >
            {message}
          </div>
        </div>
      )}

      {showNewFile && (
        <div
          className="cv-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowNewFile(false);
            }
          }}
        >
          <form
            className="cv-modal"
            onSubmit={createFile}
          >
            <div className="cv-modal-header">
              <h2 className="cv-modal-title">
                Create file
              </h2>

              <button
                type="button"
                className="cv-icon-button"
                onClick={() => setShowNewFile(false)}
              >
                ×
              </button>
            </div>

            <div className="cv-modal-body">
              <div className="cv-field">
                <label className="cv-label">
                  Project
                </label>

                <input
                  className="cv-input"
                  value={newFile.project}
                  onChange={(event) =>
                    setNewFile({
                      ...newFile,
                      project: event.target.value,
                    })
                  }
                  placeholder="Weblixi"
                />
              </div>

              <div className="cv-field">
                <label className="cv-label">
                  Folder
                </label>

                <input
                  className="cv-input"
                  value={newFile.folder}
                  onChange={(event) =>
                    setNewFile({
                      ...newFile,
                      folder: event.target.value,
                    })
                  }
                  placeholder="/src/"
                />
              </div>

              <div className="cv-field">
                <label className="cv-label">
                  File name
                </label>

                <input
                  className="cv-input"
                  value={newFile.name}
                  onChange={(event) =>
                    setNewFile({
                      ...newFile,
                      name: event.target.value,
                    })
                  }
                  placeholder="App.jsx"
                />
              </div>

              <div className="cv-field">
                <label className="cv-label">
                  Code
                </label>

                <textarea
                  className="cv-textarea"
                  value={newFile.code}
                  onChange={(event) =>
                    setNewFile({
                      ...newFile,
                      code: event.target.value,
                    })
                  }
                  placeholder="Paste your code here..."
                />
              </div>
            </div>

            <div className="cv-modal-footer">
              <button
                type="button"
                className="cv-button"
                onClick={() => setShowNewFile(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="cv-button cv-button-primary"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create file"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showGithub && (
        <GithubModal
          records={records}
          selectedProject={selectedProject}
          onClose={() => setShowGithub(false)}
        />
      )}
    </main>
  );
}

function getFileIcon(filename = "") {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".html")) return "◇";
  if (lower.endsWith(".css")) return "◆";
  if (lower.endsWith(".jsx")) return "◈";
  if (lower.endsWith(".js")) return "◇";
  if (lower.endsWith(".ts")) return "◇";
  if (lower.endsWith(".tsx")) return "◈";
  if (lower.endsWith(".json")) return "{}";
  if (lower.endsWith(".md")) return "M";
  if (lower.endsWith(".py")) return "P";
  if (lower.endsWith(".java")) return "J";
  if (lower.endsWith(".cpp")) return "C";
  if (lower.endsWith(".sql")) return "S";

  return "•";
}

function GithubModal({
  records,
  selectedProject,
  onClose,
}) {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [commitMessage, setCommitMessage] = useState(
    "Update project from CodeVault"
  );

  const [loadingRepos, setLoadingRepos] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRepositories() {
    if (!username.trim() || !token.trim()) {
      setMessage("Enter your GitHub username and token.");
      return;
    }

    setLoadingRepos(true);
    setMessage("");

    try {
      const response = await fetch("/api/github/repos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          token: token.trim(),
        }),
      });

      const data = await resp