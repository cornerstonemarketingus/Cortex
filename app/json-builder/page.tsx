"use client";

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageSection, SectionType } from '@/lib/builder/page-model';
import { DEFAULT_SECTION_PROPS, createSection } from '@/lib/builder/page-model';
import { SECTION_LABELS, RenderSection } from '@/lib/builder/component-registry';

// ---- Sortable Section Wrapper ----

function SortableSection({
  section,
  isSelected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  section: PageSection;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group border-2 transition-colors ${isSelected ? 'border-[#C69C6D]' : 'border-transparent hover:border-blue-300'}`}
      onClick={() => onSelect(section.id)}
    >
      {/* Drag handle + controls overlay */}
      <div className="absolute top-2 right-2 z-20 hidden group-hover:flex items-center gap-1 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm px-2 py-1">
        <button
          {...listeners}
          {...attributes}
          className="cursor-grab px-1 text-gray-400 hover:text-gray-700 text-xs"
          title="Drag to reorder"
        >
          ⠿
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(section.id); }}
          className="px-1 text-gray-400 hover:text-gray-700 text-xs"
          title="Move up"
        >↑</button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(section.id); }}
          className="px-1 text-gray-400 hover:text-gray-700 text-xs"
          title="Move down"
        >↓</button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
          className="px-1 text-red-400 hover:text-red-600 text-xs"
          title="Remove section"
        >✕</button>
      </div>
      {/* Section type badge */}
      <div className={`absolute top-2 left-2 z-20 hidden group-hover:block text-xs px-2 py-0.5 rounded bg-[#1E3A5F] text-white`}>
        {SECTION_LABELS[section.type]}
      </div>
      <RenderSection section={section} />
    </div>
  );
}

// ---- Prop Editor ----

function PropEditor({
  section,
  onChange,
}: {
  section: PageSection;
  onChange: (id: string, props: Record<string, unknown>) => void;
}) {
  const [jsonValue, setJsonValue] = useState(JSON.stringify(section.props, null, 2));
  const [jsonError, setJsonError] = useState('');

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    try {
      const parsed = JSON.parse(value);
      setJsonError('');
      onChange(section.id, parsed);
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  const renderField = (key: string, value: unknown, depth = 0): React.ReactElement | null => {
    if (typeof value === 'string') {
      return (
        <div key={key} className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
          {value.length > 80 || key === 'content' ? (
            <textarea
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent resize-none"
              rows={3}
              value={value}
              onChange={(e) => {
                const updated = { ...section.props, [key]: e.target.value };
                onChange(section.id, updated);
              }}
            />
          ) : (
            <input
              type="text"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              value={value}
              onChange={(e) => {
                const updated = { ...section.props, [key]: e.target.value };
                onChange(section.id, updated);
              }}
            />
          )}
        </div>
      );
    }
    if (typeof value === 'boolean') {
      return (
        <div key={key} className="mb-3 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
          <button
            onClick={() => onChange(section.id, { ...section.props, [key]: !value })}
            className={`w-8 h-4 rounded-full transition-colors ${value ? 'bg-[#1E3A5F]' : 'bg-gray-300'}`}
          />
        </div>
      );
    }
    if (typeof value === 'number') {
      return (
        <div key={key} className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
          <input
            type="number"
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            value={value}
            onChange={(e) => onChange(section.id, { ...section.props, [key]: Number(e.target.value) })}
          />
        </div>
      );
    }
    return (
      <div key={key} className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
        <div className="text-xs text-gray-400 italic">(Edit in JSON mode for complex fields)</div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        <span className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wide">{SECTION_LABELS[section.type]}</span>
      </div>

      {/* Simple fields */}
      <div className="mb-4">
        {Object.entries(section.props)
          .filter(([, v]) => typeof v !== 'object' || v === null)
          .map(([k, v]) => renderField(k, v))}
      </div>

      {/* JSON editor for complex props */}
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-400 hover:text-gray-700 font-medium mb-2">
          Advanced (JSON)
        </summary>
        <textarea
          className={`w-full border rounded px-2 py-1.5 text-xs font-mono h-48 resize-y ${jsonError ? 'border-red-400' : 'border-gray-200'}`}
          value={jsonValue}
          onChange={(e) => handleJsonChange(e.target.value)}
          spellCheck={false}
        />
        {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
      </details>
    </div>
  );
}

// ---- Copilot chat panel ----

function BuilderCopilot({ onInjectSection, pageTitle }: { onInjectSection: (s: PageSection) => void; pageTitle: string }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: `Hi! I'm your builder copilot for "${pageTitle}". Tell me what to add — e.g. "Add a testimonials section" or "Change the hero headline to Summer Sale".` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userMsg, context: { activePage: 'builder', pageTitle } }),
      });
      const data = await res.json();

      if (data.action?.type === 'UPDATE_BUILDER' && data.action?.payload?.section) {
        const s = data.action.payload.section;
        if (s.type && SECTION_LABELS[s.type as SectionType]) {
          const newSection = createSection(s.type as SectionType, s.props || DEFAULT_SECTION_PROPS[s.type as SectionType]);
          onInjectSection(newSection);
          setMessages((m) => [...m, { role: 'assistant', text: data.text || `Added ${SECTION_LABELS[s.type as SectionType]} section!` }]);
        } else {
          setMessages((m) => [...m, { role: 'assistant', text: data.text || "Done!" }]);
        }
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: data.text || "I'm on it!" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: "Sorry, something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'assistant' ? 'text-gray-700' : 'text-[#1E3A5F] font-medium'}`}>
            <span className="text-xs text-gray-400 mr-1">{m.role === 'assistant' ? '🤖' : '👤'}</span>
            {m.text}
          </div>
        ))}
        {loading && <div className="text-sm text-gray-400 animate-pulse">Thinking...</div>}
      </div>
      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder='Try "Add testimonials section"...'
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
          />
          <button
            onClick={send}
            disabled={loading}
            className="px-3 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm hover:bg-[#162d4a] disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main builder page ----

const ALL_SECTION_TYPES = Object.keys(SECTION_LABELS) as SectionType[];

export default function JSONBuilderPage() {
  const [sections, setSections] = useState<PageSection[]>([
    createSection('hero', DEFAULT_SECTION_PROPS['hero']),
    createSection('services', DEFAULT_SECTION_PROPS['services']),
    createSection('cta', DEFAULT_SECTION_PROPS['cta']),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState('My Website');
  const [activeTab, setActiveTab] = useState<'props' | 'copilot' | 'json'>('copilot');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedSection = sections.find((s) => s.id === selectedId) ?? null;

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const addSection = (type: SectionType) => {
    const newSection = createSection(type, DEFAULT_SECTION_PROPS[type]);
    setSections((prev) => [...prev, newSection]);
    setSelectedId(newSection.id);
  };

  const deleteSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateProps = (id: string, props: Record<string, unknown>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, props } : s)));
  };

  const moveSection = (id: string, dir: 'up' | 'down') => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (dir === 'up' && idx > 0) return arrayMove(prev, idx, idx - 1);
      if (dir === 'down' && idx < prev.length - 1) return arrayMove(prev, idx, idx + 1);
      return prev;
    });
  };

  const injectSection = (section: PageSection) => {
    setSections((prev) => [...prev, section]);
    setSelectedId(section.id);
  };

  const savePage = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/builder/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pageTitle,
          slug: pageTitle.toLowerCase().replace(/\s+/g, '-'),
          sections,
        }),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const pageJson = JSON.stringify({ title: pageTitle, sections }, null, 2);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" style={{ colorScheme: 'light' }}>

      {/* LEFT: Section palette */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-[#1E3A5F]">Add Sections</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {ALL_SECTION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => addSection(type)}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#1E3A5F]/5 text-gray-700 hover:text-[#1E3A5F] transition-colors mb-0.5 flex items-center gap-2"
            >
              <span className="text-xs">+</span>
              {SECTION_LABELS[type]}
            </button>
          ))}
        </div>
      </aside>

      {/* CENTER: Canvas */}
      <main className="flex-1 overflow-y-auto">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className="text-sm font-semibold text-[#1E3A5F] border-0 focus:ring-0 bg-transparent min-w-0 flex-1"
            placeholder="Page title..."
          />
          <span className="text-xs text-gray-400">{sections.length} sections</span>
          <a
            href="/builder/preview"
            target="_blank"
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            Preview
          </a>
          <button
            onClick={savePage}
            disabled={saving}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${saveStatus === 'saved' ? 'bg-green-500 text-white' : saveStatus === 'error' ? 'bg-red-500 text-white' : 'bg-[#1E3A5F] text-white hover:bg-[#162d4a]'} disabled:opacity-50`}
          >
            {saving ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Error' : 'Save Page'}
          </button>
        </div>

        {/* Drag-and-drop canvas */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <p className="text-lg">Canvas is empty</p>
                <p className="text-sm">Add sections from the left panel</p>
              </div>
            ) : (
              sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  isSelected={selectedId === section.id}
                  onSelect={setSelectedId}
                  onDelete={deleteSection}
                  onMoveUp={(id) => moveSection(id, 'up')}
                  onMoveDown={(id) => moveSection(id, 'down')}
                />
              ))
            )}
          </SortableContext>
        </DndContext>
      </main>

      {/* RIGHT: Props + Copilot panel */}
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['copilot', 'props', 'json'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${activeTab === tab ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab === 'copilot' ? '🤖 Copilot' : tab === 'props' ? '⚙️ Props' : '{ } JSON'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'copilot' && (
            <BuilderCopilot onInjectSection={injectSection} pageTitle={pageTitle} />
          )}
          {activeTab === 'props' && (
            selectedSection ? (
              <PropEditor section={selectedSection} onChange={updateProps} />
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">
                Click any section on the canvas to edit its properties.
              </div>
            )
          )}
          {activeTab === 'json' && (
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-2">Page JSON (read-only)</p>
              <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                {pageJson}
              </pre>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
