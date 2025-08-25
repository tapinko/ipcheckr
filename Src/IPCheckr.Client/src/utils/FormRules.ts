import i18n, { TranslationKey } from "./i18n"

/**
 * Form validation rules for various input fields.
 * Provides methods to generate validation rules with appropriate messages.
 * For mui TextField components with react-hook-form.
 */
class FormRules {
  /**
   * Uses a translation key for the error message.
   * The message is retrieved from the i18n module.
   * This rule can be used for fields that must not be empty.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.required()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for required fields.
   * @memberof FormRules
   */
  static required(): object {
    const message = TranslationKey.FORM_RULES_REQUIRED
    return { required: { value: true, message } }
  }

  /**
   * Min 5.
   * Generates a validation rule for minimum length - the long variant.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.minLengthLong()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for minimum length - the long variant.
   * @memberof FormRules
   */
  static minLengthLong(): object {
    const length = 5
    const message = i18n.t(TranslationKey.FORM_RULES_MIN_LENGTH, { value: length })
    return { minLength: { value: length, message } }
  }

  /**
   * Min 2.
   * Generates a validation rule for minimum length - the short variant.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.minLengthShort()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for minimum length - the short variant.
   * @memberof FormRules
   */
  static minLengthShort(): object {
    const length = 2
    const message = i18n.t(TranslationKey.FORM_RULES_MIN_LENGTH, { value: length })
    return { minLength: { value: length, message } }
  }

  /**
   * Generates a validation rule for custom minimum length.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.minLengthCustom(3)}
   * />
   * ```
   * 
   * @param {number} length - The custom minimum length.
   * @returns {object} Validation rule for custom minimum length.
   * @memberof FormRules
   */
  static minLengthCustom(length: number): object {
    const message = i18n.t(TranslationKey.FORM_RULES_MIN_LENGTH, { value: length })
    return { minLength: { value: length, message } }
  }

  /**
   * Max 50.
   * Generates a validation rule for maximum length - the long variant.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.maxLengthLong()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for maximum length - the long variant.
   * @memberof FormRules
   */
  static maxLengthLong(): object {
    const length = 50
    const message = i18n.t(TranslationKey.FORM_RULES_MAX_LENGTH, { value: length })
    return { maxLength: { value: length, message } }
  }

  /**
   * Max 20.
   * Generates a validation rule for maximum length - the short variant.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.maxLengthShort()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for maximum length - the short variant.
   * @memberof FormRules
   */
  static maxLengthShort(): object {
    const length = 20
    const message = i18n.t(TranslationKey.FORM_RULES_MAX_LENGTH, { value: length })
    return { maxLength: { value: length, message } }
  }

  /**
   * Generates a validation rule for custom maximum length.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.maxLengthCustom(30)}
   * />
   * ```
   * 
   * @param {number} length - The custom maximum length.
   * @returns {object} Validation rule for custom maximum length.
   * @memberof FormRules
   */
  static maxLengthCustom(length: number): object {
    const message = i18n.t(TranslationKey.FORM_RULES_MAX_LENGTH, { value: length })
    return { maxLength: { value: length, message } }
  }

  /**
   * Generates a validation rule for letters.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.patternLetters()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for letters.
   * @memberof FormRules
   */
  static patternLetters(): object {
    const pattern = /^[a-zA-Z]+$/
    const message = TranslationKey.FORM_RULES_PATTERN_LETTERS
    return {
      pattern: { value: pattern, message: message },
    }
  }

  /**
   * Generates a validation rule for letters and spaces.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.patternLettersSpaces()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for letters and spaces.
   * @memberof FormRules
   */
  static patternLettersSpaces(): object {
    const pattern = /^[a-zA-Z\s]+$/
    const message = TranslationKey.FORM_RULES_PATTERN_LETTERS_SPACES
    return {
      pattern: { value: pattern, message: message },
    }
  }

  /**
   * Generates a validation rule for letters and numbers.
   * The message is retrieved from the i18n module.
   *
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.patternLettersNumbers()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for letters and numbers.
   * @memberof FormRules
   */
  static patternLettersNumbers(): object {
    const pattern = /^[a-zA-Z0-9]+$/
    const message = TranslationKey.FORM_RULES_PATTERN_LETTERS_NUMBERS
    return {
      pattern: { value: pattern, message: message },
    }
  }

  /**
   * Generates a validation rule for letters, numbers, and dots.
   * The message is retrieved from the i18n module.
   *
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.patternLettersNumbersDots()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for letters, numbers, and dots.
   * @memberof FormRules
   */
  static patternLettersNumbersDots(): object {
    const pattern = /^[a-zA-Z0-9.]+$/
    const message = TranslationKey.FORM_RULES_PATTERN_LETTERS_NUMBERS_DOTS
    return {
      pattern: { value: pattern, message: message },
    }
  }

  /**
   * Generates a validation rule for letters, numbers, and spaces.
   * The message is retrieved from the i18n module.
   *
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.patternLettersNumbersSpaces()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for letters, numbers, and spaces.
   * @memberof FormRules
   */
  static patternLettersNumbersSpaces(): object {
    const pattern = /^[a-zA-Z0-9\s]+$/
    const message = TranslationKey.FORM_RULES_PATTERN_LETTERS_NUMBERS_SPACES
    return {
      pattern: { value: pattern, message: message },
    }
  }

  /**
   * Generates a validation rule for letters, numbers, and special characters.
   * The message is retrieved from the i18n module.
   *
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.patternLettersNumbersSpecial()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for letters, numbers, and special characters.
   * @memberof FormRules
   */
  static patternLettersNumbersSpecial(): object {
    const pattern = /^[a-zA-Z0-9!@#$%^&*()_+={}\[\]:"'<>,.?\/\\|-]+$/
    const message = TranslationKey.FORM_RULES_PATTERN_LETTERS_NUMBERS_SPECIAL
    return {
      pattern: { value: pattern, message: message },
    }
  }

  /**
   * Generates a validation rule for letters, numbers, special characters, and spaces.
   * The message is retrieved from the i18n module.
   *
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.patternLettersNumbersSpecialSpaces()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for letters, numbers, special characters, and spaces.
   * @memberof FormRules
   */
  static patternLettersNumbersSpecialSpaces(): object {
    const pattern = /^[a-zA-Z0-9!@#$%^&*()_+={}\[\]:"'<>,.?\/\\|-]+\s*$/
    const message = TranslationKey.FORM_RULES_PATTERN_LETTERS_NUMBERS_SPECIAL_SPACES
    return {
      pattern: { value: pattern, message: message },
    }
  }

  /**
   * Generates a validation rule for IP address format.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.patternIpAddress()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for IP address format.
   * @memberof FormRules
   */
  static patternIpAddress(): object {
    const pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const message = TranslationKey.FORM_RULES_PATTERN_IP_ADDRESS
    return {
      pattern: { value: pattern, message: message },
    }
  }

  /**
   * Generates a validation rule for CIDR notation.
   * The message is retrieved from the i18n module.
   * 
   * @example
   * ```javascript
   * <TextField
   *   {...FormRules.patternCidrNotation()}
   * />
   * ```
   * 
   * @returns {object} Validation rule for CIDR notation.
   * @memberof FormRules
   */
  static patternCidrNotation(): object {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/
    const message = TranslationKey.FORM_RULES_PATTERN_CIDR_NOTATION
    return {
      pattern: { value: pattern, message: message },
    }
  }
}

export default FormRules