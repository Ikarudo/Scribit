import { escapeHtml } from '@/components/notesContentUtils';

export type NoteTemplateId =
  | 'blank'
  | 'lecture_notes'
  | 'assignment_notes'
  | 'study_guide'
  | 'essay_outline'
  | 'meeting_notes'
  | 'daily_journal';

export type NoteTemplate = {
  id: NoteTemplateId;
  name: string;
  description: string;
  sections: string[];
};

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank note',
    description: 'Start from scratch.',
    sections: [],
  },
  {
    id: 'lecture_notes',
    name: 'Lecture Notes',
    description: 'Capture key points, examples, and review questions.',
    sections: ['Key Points', 'Examples/Diagrams', 'Summary', 'Questions'],
  },
  {
    id: 'assignment_notes',
    name: 'Assignment Notes',
    description: 'Track requirements, resources, and due dates.',
    sections: ['Instructions', 'Requirements', 'Resources'],
  },
  {
    id: 'study_guide',
    name: 'Study Guide',
    description: 'Definitions, concepts, practice questions, and tips.',
    sections: ['Definitions', 'Key Concepts', 'Practice Questions', 'Tips'],
  },
  {
    id: 'essay_outline',
    name: 'Essay Outline',
    description: 'Organize thesis, body points, and references.',
    sections: ['Thesis', 'Introduction', 'Body', 'Conclusion', 'References'],
  },
  {
    id: 'meeting_notes',
    name: 'Meeting Notes',
    description: 'Agenda, discussion points, action items, next steps.',
    sections: ['Agenda', 'Discussion', 'Action Items', 'Next Steps'],
  },
  {
    id: 'daily_journal',
    name: 'Daily Journal',
    description: 'Gratitude, highlights, challenges, and tomorrow’s plan.',
    sections: ['Gratitude', 'Highlights', 'Challenges', 'Tomorrow'],
  },
];

export function getNoteTemplate(id: NoteTemplateId): NoteTemplate {
  return NOTE_TEMPLATES.find((t) => t.id === id) ?? NOTE_TEMPLATES[0];
}

function em(text: string) {
  return `<em>${escapeHtml(text)}</em>`;
}

function h2(text: string) {
  return `<h2>${escapeHtml(text)}</h2>`;
}

function field(label: string, value?: string) {
  const v = value ? escapeHtml(value) : em('...');
  return `<p><strong>${escapeHtml(label)}</strong> ${v}</p>`;
}

function emptyParagraph() {
  return `<p></p>`;
}

function bulletList(itemCount: number) {
  // TenTap/Tiptap list items usually contain a paragraph.
  // We intentionally leave paragraphs empty so the editor can show a real placeholder
  // (that disappears as soon as the user types) while keeping bullet formatting.
  return `<ul>${Array.from({ length: itemCount })
    .map(() => `<li><p></p></li>`)
    .join('')}</ul>`;
}

function orderedList(itemCount: number) {
  return `<ol>${Array.from({ length: itemCount })
    .map(() => `<li><p></p></li>`)
    .join('')}</ol>`;
}

export function buildNoteTemplateHtml(id: NoteTemplateId, now: Date = new Date()): string {
  if (id === 'blank') return '';

  const dateDisplay = now.toLocaleDateString();

  switch (id) {
    case 'lecture_notes':
      return [
        field('Title:', undefined),
        field('Date:', dateDisplay),
        field('Course:', undefined),
        h2('Key Points'),
        bulletList(1),
        h2('Examples / Diagrams'),
        bulletList(1),
        h2('Summary'),
        emptyParagraph(),
        h2('Questions for Review'),
        orderedList(1),
      ].join('');

    case 'assignment_notes':
      return [
        field('Course/Subject:', undefined),
        field('Assignment Title:', undefined),
        field('Due Date:', undefined),
        h2('Instructions / Requirements'),
        bulletList(1),
        h2('Resources / References'),
        bulletList(1),
      ].join('');

    case 'study_guide':
      return [
        field('Topic/Chapter:', undefined),
        h2('Definitions'),
        bulletList(1),
        h2('Key Concepts'),
        bulletList(1),
        h2('Practice Questions'),
        orderedList(1),
        h2('Mnemonics / Tips'),
        bulletList(1),
      ].join('');

    case 'essay_outline':
      return [
        h2('Thesis Statement'),
        emptyParagraph(),
        h2('Introduction'),
        bulletList(1),
        h2('Body Paragraphs'),
        orderedList(1),
        h2('Conclusion'),
        bulletList(1),
        h2('References'),
        bulletList(1),
      ].join('');

    case 'meeting_notes':
      return [
        field('Date:', dateDisplay),
        field('Attendees:', undefined),
        h2('Agenda'),
        bulletList(1),
        h2('Key Discussion Points'),
        bulletList(1),
        h2('Action Items'),
        bulletList(1),
        h2('Next Steps'),
        bulletList(1),
      ].join('');

    case 'daily_journal':
      return [
        field('Date:', dateDisplay),
        h2('Gratitude'),
        bulletList(1),
        h2('Highlights of the Day'),
        bulletList(1),
        h2('Challenges'),
        bulletList(1),
        h2('Plans for Tomorrow'),
        orderedList(1),
      ].join('');
  }
}

export function defaultTitleForTemplate(id: NoteTemplateId, now: Date = new Date()): string {
  const t = getNoteTemplate(id);
  if (id === 'blank') {
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${t.name} — ${now.toLocaleDateString()}`;
}

