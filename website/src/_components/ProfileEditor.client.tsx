"use client";

import jsonSchema from "../_profile-builder-json-schema/profile.complete.schema.json";
import { ChangeEventHandler, useCallback, useEffect, useRef } from "react";

declare class JSONEditor {
  constructor(element: HTMLElement, options: Record<string, unknown>);
  getValue(): Record<string, unknown>;
  setValue(input: unknown): void;
  validate(): void;
  showValidationErrors(): void;
}

export const ProfileEditor = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<JSONEditor | null>(null);

  const handleSave = () => {
    if (!editorRef.current) return;
    const value = editorRef.current.getValue();
    const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.download = `profile.tswprofile`;
    downloadLink.href = url;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(url);
  };

  const handleOpen: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (
      !event.currentTarget.files?.length ||
      !event.currentTarget.files[0].name.match(/\.json|\.tswprofile$/)
    ) {
      return;
    }

    const [file] = event.currentTarget.files;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const json = JSON.parse(reader.result?.toString() ?? "{}");
      editorRef.current?.setValue(json);
      editorRef.current?.validate();
      editorRef.current?.showValidationErrors();
    });
    reader.readAsText(file);
  };

  const handleInitializeEditor = useCallback(() => {
    if (
      !containerRef.current ||
      typeof JSONEditor === "undefined" ||
      editorRef.current
    )
      return;
    const profile_data_raw = new URL(window.location.href).searchParams.get(
      "profile"
    );
    const profile_data = profile_data_raw
      ? JSON.parse(atob(profile_data_raw))
      : {};

    editorRef.current = new JSONEditor(containerRef.current, {
      schema: jsonSchema,
      display_required_only: true,
      keep_oneof_values: false,
      theme: "barebones",
      startval: profile_data,
    });
  }, []);

  const handleContainerRef = useCallback(
    (ref: HTMLDivElement | null) => {
      containerRef.current = ref;
      handleInitializeEditor();
    },
    [handleInitializeEditor]
  );

  useEffect(() => {
    const script =
      document.querySelector<HTMLScriptElement>("script#jsoneditor") ??
      document.createElement("script");
    script.id = "jsoneditor";
    script.onload = () => setTimeout(handleInitializeEditor, 0);
    script.src =
      "https://cdn.jsdelivr.net/npm/@json-editor/json-editor@latest/dist/jsoneditor.min.js";
    document.body.appendChild(script);
  }, [handleInitializeEditor]);

  return (
    <>
      <div id="editor" ref={handleContainerRef}></div>
      <div className="px-6 mx-auto max-w-4xl sticky bottom-4">
        <div className="bg-base-100 border-base-content/5 border rounded-lg shadow-xl">
          <div className="m-4 flex items-center gap-2">
            <button className="btn btn-primary" onClick={handleSave}>
              Save
            </button>
            <div>
              <label className="btn">
                Open
                <input
                  className="hidden"
                  type="file"
                  accept=".json,.tswprofile"
                  onChange={handleOpen}
                ></input>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
