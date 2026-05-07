import React, { useEffect, useMemo, useRef } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from "@codemirror/view";
import { StateField, StateEffect, Range } from "@codemirror/state";
import { lex, KEYWORDS } from "@/lib/nexus/lexer";
import type { LexError } from "@/lib/nexus/lexer";
import type { ParseError } from "@/lib/nexus/parser";

interface NexusEditorProps {
  code: string;
  onChange: (value: string) => void;
  errors: ParseError[];
  lexErrors: LexError[];
}

// Map token kind to CM classes for styling
function getTokenClass(kind: string): string {
  if (KEYWORDS.has(kind)) return "cm-nexus-keyword";
  if (kind === "UnitLiteral") return "cm-nexus-unit";
  if (kind === "FloatLiteral" || kind === "IntLiteral") return "cm-nexus-number";
  if (kind === "StringLiteral") return "cm-nexus-string";
  if (kind === "Identifier") return "cm-nexus-identifier";
  if (kind === "EOF" || kind === "Error") return "cm-nexus-error";
  return "cm-nexus-operator";
}

const nexusHighlighter = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }
  buildDecorations(view: EditorView) {
    const builder: Range<Decoration>[] = [];
    const doc = view.state.doc.toString();
    const { tokens } = lex(doc);
    
    for (const t of tokens) {
      if (t.kind === "EOF") continue;
      // Skip if out of viewport (optimization)
      if (t.span.start >= view.viewport.to || t.span.end <= view.viewport.from) continue;
      
      const cls = getTokenClass(t.kind);
      if (cls) {
        builder.push(Decoration.mark({ class: cls }).range(t.span.start, t.span.end));
      }
    }
    return Decoration.set(builder, true);
  }
}, { decorations: v => v.decorations });

const errorEffect = StateEffect.define<Range<Decoration>[]>();
const errorState = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value, tr) {
    value = value.map(tr.changes);
    for (let e of tr.effects) {
      if (e.is(errorEffect)) {
        value = Decoration.set(e.value, true);
      }
    }
    return value;
  },
  provide: f => EditorView.decorations.from(f)
});


export default function NexusEditor({ code, onChange, errors, lexErrors }: NexusEditorProps) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  // Apply errors
  useEffect(() => {
    const view = cmRef.current?.view;
    if (!view) return;

    const decos: Range<Decoration>[] = [];
    const markErr = Decoration.mark({ class: "cm-nexus-diag-error" });
    
    const addError = (span: { start: number, end: number }) => {
      try {
        const start = Math.min(Math.max(span.start, 0), view.state.doc.length);
        const end = Math.min(Math.max(span.end, start), view.state.doc.length);
        if (start < end) {
          decos.push(markErr.range(start, end));
        }
      } catch (e) {}
    };

    lexErrors.forEach(e => addError(e.span));
    errors.forEach(e => addError(e.span));

    view.dispatch({
      effects: errorEffect.of(decos)
    });
  }, [errors, lexErrors]);

  const extensions = useMemo(() => [
    oneDark,
    nexusHighlighter,
    errorState
  ], []);

  return (
    <div className="h-full w-full relative editor-wrapper">
      <style dangerouslySetInnerHTML={{__html: `
        .cm-nexus-keyword { color: #56b6c2; font-weight: bold; }
        .cm-nexus-unit { color: #e5c07b; font-weight: bold; }
        .cm-nexus-number { color: #d19a66; }
        .cm-nexus-string { color: #98c379; }
        .cm-nexus-identifier { color: #abb2bf; }
        .cm-nexus-operator { color: #5c6370; }
        .cm-nexus-diag-error { text-decoration: underline wavy #e06c75; background: rgba(224, 108, 117, 0.1); }
        .cm-editor { height: 100%; outline: none !important; }
        .cm-scroller { font-family: var(--font-mono); font-size: 13px; line-height: 1.6; }
      `}} />
      <CodeMirror
        ref={cmRef}
        value={code}
        onChange={onChange}
        theme={oneDark}
        extensions={extensions}
        height="100%"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true
        }}
      />
    </div>
  );
}
