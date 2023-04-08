import SelectionUtils from './SelectionUtils';
import css from './Hyperlink.css';

export default class Hyperlink {

    constructor({ data, config, api, readOnly }) {
        this.toolbar = api.toolbar;
        this.inlineToolbar = api.inlineToolbar;
        this.tooltip = api.tooltip;
        this.i18n = api.i18n;
        this.config = config;
        this.selection = new SelectionUtils();

        this.commandLink = 'createLink';
        this.commandUnlink = 'unlink';

        this.CSS = {
            wrapper: 'ce-inline-tool-hyperlink-wrapper',
            wrapperShowed: 'ce-inline-tool-hyperlink-wrapper--showed',
            button: 'ce-inline-tool',
            buttonActive: 'ce-inline-tool--active',
            buttonModifier: 'ce-inline-tool--link',
            buttonUnlink: 'ce-inline-tool--unlink',
            input: 'ce-inline-tool-hyperlink--input',
            selectTarget: 'ce-inline-tool-hyperlink--select-target',
            selectRel: 'ce-inline-tool-hyperlink--select-rel',
            checkboxLabel: 'ce-inline-tool-hyperlink--checkbox-label',
            checkboxInput: 'ce-inline-tool-hyperlink--checkbox-input',
            buttonSave: 'ce-inline-tool-hyperlink--button',
        };

        this.targetAttributes = this.config.availableTargets || [
          { text: 'New window', value: '_blank' },   // Opens the linked document in a new window or tab
          { text: 'Current frame', value: '_self' },    // Opens the linked document in the same frame as it was clicked (this is default)
          { text: 'Parent frame', value: '_parent' },  // Opens the linked document in the parent frame
          { text: 'Top frame', value: '_top' },     // Opens the linked document in the full body of the window
        ];

        this.relAttributes = this.config.availableRels || [
            'alternate',    //Provides a link to an alternate representation of the document (i.e. print page, translated or mirror)
            'author',       //Provides a link to the author of the document
            'bookmark',     //Permanent URL used for bookmarking
            'external',     //Indicates that the referenced document is not part of the same site as the current document
            'help',         //Provides a link to a help document
            'license',      //Provides a link to licensing information for the document
            'next',         //Provides a link to the next document in the series
            'nofollow',     //Links to an unendorsed document, like a paid link. ("nofollow" is used by Google, to specify that the Google search spider should not follow that link)
            'noreferrer',   //Requires that the browser should not send an HTTP referer header if the user follows the hyperlink
            'noopener',     //Requires that any browsing context created by following the hyperlink must not have an opener browsing context
            'prev',         //The previous document in a selection
            'search',       //Links to a search tool for the document
            'tag',          //A tag (keyword) for the current document
        ];

        this.nodes = {
            button: null,
            wrapper: null,
            input: null,
            selectTarget: null,
            selectRel: null,
            buttonSave: null,
        };

        this.inputOpened = false;
    }

    render() {
        this.nodes.button = document.createElement('button');
        this.nodes.button.type = 'button';
        this.nodes.button.classList.add(this.CSS.button, this.CSS.buttonModifier);
        this.nodes.button.appendChild(this.iconSvg('link', 14, 10));
        this.nodes.button.appendChild(this.iconSvg('unlink', 15, 11));
        return this.nodes.button;
    }

    renderActions() {
        this.nodes.wrapper = document.createElement('div');
        this.nodes.wrapper.classList.add(this.CSS.wrapper);

        // Input
        this.nodes.input = document.createElement('input');
        this.nodes.input.placeholder = 'https://...';
        this.nodes.input.classList.add(this.CSS.input);
        this.nodes.input.addEventListener('blur', this.onBlur.bind(this));

        // Target
        this.nodes.selectTarget = document.createElement('select');
        this.nodes.selectTarget.classList.add(this.CSS.selectTarget);
        this.addOption(this.nodes.selectTarget, { text: this.i18n.t('Select target'), value: '' });
        for (const targetAttribute of this.targetAttributes) {
            this.addOption(this.nodes.selectTarget, targetAttribute);
        }

        if (!!this.config.target) {
            if (this.targetAttributes.length === 0) {
                this.addOption(this.nodes.selectTarget, this.config.target);
            }

            this.nodes.selectTarget.value = this.config.target.value;
        }

        // Rel
        this.nodes.selectRel = document.createElement('div');
        this.nodes.selectRel.classList.add(this.CSS.selectRel);
        for (const relAttribute of this.relAttributes) {
            this.addCheckbox(this.nodes.selectRel, relAttribute, relAttribute);
        }

        if (!!this.config.rel && this.relAttributes.length === 0) {
            this.addCheckbox(this.nodes.selectTarget, this.config.rel, this.config.rel, true);
        }

        // Button
        this.nodes.buttonSave = document.createElement('button');
        this.nodes.buttonSave.type = 'button';
        this.nodes.buttonSave.classList.add(this.CSS.buttonSave);
        this.nodes.buttonSave.innerHTML = this.i18n.t('Save');
        this.nodes.buttonSave.addEventListener('click', (event) => {
            this.savePressed(event);
        });

        // append
        this.nodes.wrapper.appendChild(this.nodes.input);

        if (!!this.targetAttributes && this.targetAttributes.length > 0) {
            this.nodes.wrapper.appendChild(this.nodes.selectTarget);
        }

        if (!!this.relAttributes && this.relAttributes.length > 0) {
            this.nodes.wrapper.appendChild(this.nodes.selectRel);
        }

        this.nodes.wrapper.appendChild(this.nodes.buttonSave);

        return this.nodes.wrapper;
    }

    surround(range) {
        if (range) {
            if (!this.inputOpened) {
                this.selection.setFakeBackground();
                this.selection.save();
            } else {
                this.selection.restore();
                this.selection.removeFakeBackground();
            }
            const parentAnchor = this.selection.findParentTag('A');
            if (parentAnchor) {
                this.selection.expandToTag(parentAnchor);
                this.unlink();
                this.closeActions();
                this.checkState();
                this.toolbar.close();
                return;
            }
        }
        this.toggleActions();
    }

    get shortcut() {
        return this.config.shortcut || 'CMD+L';
    }

    get title() {
        return 'Hyperlink';
    }

    static get isInline() {
        return true;
    }

    static get sanitize() {
        return {
            a: {
                href: true,
                target: true,
                rel: true,
            },
        };
    }

    checkState(selection = null) {
        const anchorTag = this.selection.findParentTag('A');
        if (anchorTag) {
            this.nodes.button.classList.add(this.CSS.buttonUnlink);
            this.nodes.button.classList.add(this.CSS.buttonActive);
            this.openActions();
            const hrefAttr = anchorTag.getAttribute('href');
            const targetAttr = anchorTag.getAttribute('target');
            const relAttr = (anchorTag.getAttribute('rel') || '').split(' ');
            this.nodes.input.value = !!hrefAttr ? hrefAttr : '';
            this.nodes.selectTarget.value = !!targetAttr ? targetAttr : '';
            for (const checkbox of this.nodes.selectRel.getElementsByClassName(this.CSS.checkboxInput)) {
                checkbox.checked = relAttr.indexOf(checkbox.dataset.rel) !== -1;
            }
            this.selection.save();
        } else {
            this.nodes.button.classList.remove(this.CSS.buttonUnlink);
            this.nodes.button.classList.remove(this.CSS.buttonActive);
        }
        return !!anchorTag;
    }

    clear() {
        this.closeActions();
    }

    toggleActions() {
        if (!this.inputOpened) {
            this.openActions(true);
        } else {
            this.closeActions(false);
        }
    }

    openActions(needFocus = false) {
        this.nodes.wrapper.classList.add(this.CSS.wrapperShowed);
        if (needFocus) {
            this.nodes.input.focus();
        }
        this.inputOpened = true;
    }

    onBlur() {
        const value = this.nodes.input.value || '';

        if (!!this.config.validate && !!this.config.validate === true && !this.validateURL(value)) {
            this.tooltip.show(this.nodes.input, this.i18n.t('The URL is not valid.'), {
                placement: 'top',
            });
            setTimeout(() => {
                this.tooltip.hide();
            }, 1000);
            return;
        }

        if (typeof this.config.configure === 'function') {
            Promise.resolve(this.config.configure(value)).then(data => {
                if (data.href) {
                    this.nodes.input.value = data.href;
                }

                if (typeof data.target === 'string') {
                    this.nodes.selectTarget.value = data.target;
                }

                if (typeof data.rels === 'object') {
                    const rels = {};
                    if (data.rels instanceof Array) {
                        for (const rel of data.rels) {
                            rels[rel] = true;
                        }
                    } else {
                        Object.assign(rels, data.rels);
                    }

                    for (const checkbox of this.nodes.selectRel.getElementsByClassName(this.CSS.checkboxInput)) {
                        if (checkbox.dataset.rel in rels) {
                            checkbox.checked = rels[checkbox.dataset.rel];
                        }
                    }
                }
            });
        }
    }

    closeActions(clearSavedSelection = true) {
        if (this.selection.isFakeBackgroundEnabled) {
            const currentSelection = new SelectionUtils();
            currentSelection.save();
            this.selection.restore();
            this.selection.removeFakeBackground();
            currentSelection.restore();
        }
        this.nodes.wrapper.classList.remove(this.CSS.wrapperShowed);
        this.nodes.input.value = '';
        this.nodes.selectTarget.value = '';
        for (const checkbox of this.nodes.selectRel.getElementsByClassName(this.CSS.checkboxInput)) {
            checkbox.checked = false;
        }

        if (clearSavedSelection) {
            this.selection.clearSaved();
        }
        this.inputOpened = false;
    }

    savePressed(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        let value = this.nodes.input.value || '';
        let target = this.nodes.selectTarget.value || '';
        const rels = [];
        for (const checkbox of this.nodes.selectRel.getElementsByClassName(this.CSS.checkboxInput)) {
            if (checkbox.checked) {
                rels.push(checkbox.dataset.rel);
            }
        }

        if (!value.trim()) {
            this.selection.restore();
            this.unlink();
            event.preventDefault();
            this.closeActions();
            return;
        }

        if (!!this.config.validate && !!this.config.validate === true && !this.validateURL(value)) {
            this.tooltip.show(this.nodes.input, this.i18n.t('The URL is not valid.'), {
                placement: 'top',
            });
            setTimeout(() => {
                this.tooltip.hide();
            }, 1000);
            return;
        }

        value = this.prepareLink(value);

        this.selection.restore();
        this.selection.removeFakeBackground();

        this.insertLink(value, target, rels.join(' '));

        this.selection.collapseToEnd();
        this.inlineToolbar.close();
    }

    validateURL(str) {
        const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
        return !!pattern.test(str);
    }

    prepareLink(link) {
        link = link.trim();
        link = this.addProtocol(link);
        return link;
    }

    addProtocol(link) {
        if (/^(\w+):(\/\/)?/.test(link)) {
            return link;
        }

        const isInternal = /^\/[^/\s]?/.test(link),
            isAnchor = link.substring(0, 1) === '#',
            isProtocolRelative = /^\/\/[^/\s]/.test(link);

        if (!isInternal && !isAnchor && !isProtocolRelative) {
            link = 'http://' + link;
        }

        return link;
    }

    insertLink(link, target = '', rel = '') {
        let anchorTag = this.selection.findParentTag('A');
        if (anchorTag) {
            this.selection.expandToTag(anchorTag);
        } else {
            document.execCommand(this.commandLink, false, link);
            anchorTag = this.selection.findParentTag('A');
        }
        if (anchorTag) {
            if (!!target) {
                anchorTag['target'] = target;
            } else {
                anchorTag.removeAttribute('target');
            }
            if (!!rel) {
                anchorTag['rel'] = rel;
            } else {
                anchorTag.removeAttribute('rel');
            }
        }
    }

    unlink() {
        document.execCommand(this.commandUnlink);
    }

    iconSvg(name, width = 14, height = 14) {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.classList.add('icon', 'icon--' + name);
        icon.setAttribute('width', width + 'px');
        icon.setAttribute('height', height + 'px');
        icon.innerHTML = `<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#${name}"></use>`;
        return icon;
    }

    addOption(element, object) {
        let option = document.createElement('option');
        option.text = object.text;
        option.value = object.value;
        element.add(option);
    }

    addCheckbox(element, text, value, checked = false) {
        let input = document.createElement('input');
        input.type = 'checkbox';
        input.classList.add(this.CSS.checkboxInput);
        input.dataset.rel = value;
        input.checked = checked;

        const label = document.createElement('label');
        label.classList.add(this.CSS.checkboxLabel);

        label.appendChild(input);
        label.insertAdjacentText('beforeend', text);

        element.appendChild(label);
    }
}
