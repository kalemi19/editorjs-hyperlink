import { ToolConstructable, ToolSettings } from '@editorjs/editorjs';
import Paragraph from '@editorjs/paragraph'
import Hyperlink from 'editorjs-hyperlink';

export const EDITOR_JS_TOOLS: { [toolName: string]: ToolConstructable | ToolSettings } = {
    paragraph: {
        class: Paragraph,
        config: {
            preserveBlank: true
        },
        inlineToolbar: true
    },
    hyperlink: {
        class: Hyperlink,
        config: {
            shortcut: 'CMD+L',
            target: { name: 'New window', value: '_blank' }, // default null
            rel: 'nofollow', // default null
            availableTargets: [{ name: 'New window', value: '_blank '}, { name: 'Current frame', value: '_self' }],
            availableRels: ['author', 'noreferrer'],
            validate: false
        },
    },
};
