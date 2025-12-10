const { TextInputBuilder as DiscordTextInputBuilder, } = require('discord.js');
class TextInputBuilder extends DiscordTextInputBuilder {
    constructor(options) {
        super();
        if (options) {
            if (options.custom_id)
                this.setCustomId(options.custom_id);
            if (options.label)
                this.setLabel(options.label);
            if (options.style !== undefined)
                this.setStyle(options.style);
            if (options.value)
                this.setValue(options.value);
            if (options.placeholder)
                this.setPlaceholder(options.placeholder);
            // @ts-ignore
            if (options.required !== undefined)
                this.setRequired(options.required);
            if (options.max_length !== undefined)
                this.setMaxLength(options.max_length);
            if (options.min_length !== undefined)
                this.setMinLength(options.min_length);
        }
    }
    setLabel(label) {
        const maxLength = 45;
        const trimmed = label.slice(0, maxLength);
        return super.setLabel(trimmed);
    }
    setPlaceholder(placeholder) {
        const maxLength = 100;
        const trimmed = placeholder.slice(0, maxLength);
        return super.setPlaceholder(trimmed);
    }
    setCustomId(customId) {
        const maxLength = 100;
        const trimmed = customId.slice(0, maxLength);
        return super.setCustomId(trimmed);
    }
    setValue(value) {
        const maxLength = this.data.max_length || 4000;
        const trimmed = value.slice(0, maxLength);
        return super.setValue(trimmed);
    }
    // @ts-ignore
    setRequired(required) {
        // @ts-ignore
        return super.setRequired(required);
    }
    toJSON() {
        // @ts-ignore
        return super.toJSON();
    }
}
