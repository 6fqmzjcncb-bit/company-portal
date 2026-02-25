/**
 * Custom Dropdown Component - Flatpickr Style
 * Converts a native select element into a custom styled dropdown
 */

function createCustomDropdown(selectElement, options = {}) {
    const {
        searchable = true,
        placeholder = 'Seçiniz...',
        emptyText = 'Sonuç bulunamadı',
        allowNew = false
    } = options;

    // Capture original style before hiding
    const originalStyle = selectElement.getAttribute('style') || '';

    // Hide original select
    selectElement.style.display = 'none';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-dropdown';
    selectElement.parentNode.insertBefore(wrapper, selectElement);
    wrapper.appendChild(selectElement);

    // Create trigger button
    const trigger = document.createElement('div');
    trigger.className = `custom-dropdown-trigger ${selectElement.className}`;
    if (originalStyle) {
        trigger.setAttribute('style', originalStyle);
    }
    // Override display to ensure flex behavior works for the trigger contents
    trigger.style.display = 'flex';
    trigger.style.alignItems = 'center';
    trigger.style.justifyContent = 'space-between';

    trigger.innerHTML = `
        <span class="custom-dropdown-value">${placeholder}</span>
        <svg class="custom-dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
    `;
    wrapper.appendChild(trigger);

    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'custom-dropdown-menu';

    // Add search if enabled
    if (searchable) {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'custom-dropdown-search';
        searchDiv.innerHTML = '<input type="text" placeholder="Ara..." />';
        menu.appendChild(searchDiv);
    }

    // Create options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-dropdown-options';
    menu.appendChild(optionsContainer);
    wrapper.appendChild(menu);

    // Populate options
    function populateOptions(filterText = '') {
        optionsContainer.innerHTML = '';
        const options = Array.from(selectElement.options);
        let hasResults = false;
        let exactMatch = false;

        options.forEach((option, index) => {
            const text = option.textContent;
            const value = option.value;

            if (!value && !text.trim() && !option.hasAttribute('value')) return; // Skip empty generic options if needed, but usually we just process them

            // Filter by search text
            if (filterText) {
                if (text.toLowerCase() === filterText.toLowerCase()) {
                    exactMatch = true;
                }
                if (!text.toLowerCase().includes(filterText.toLowerCase())) {
                    return;
                }
            }

            hasResults = true;
            const optionEl = document.createElement('div');
            optionEl.className = 'custom-dropdown-option';
            if (option.selected) {
                optionEl.classList.add('selected');
            }
            optionEl.dataset.value = value;
            optionEl.dataset.index = index;
            optionEl.innerHTML = `
                <span>${text}</span>
                <svg class="custom-dropdown-option-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            `;

            optionEl.addEventListener('click', () => {
                selectOption(index);
            });

            optionsContainer.appendChild(optionEl);
        });

        if (!hasResults && !allowNew) {
            optionsContainer.innerHTML = `<div class="custom-dropdown-option" style="color: #9ca3af; cursor: default;">${emptyText}</div>`;
        }

        if (allowNew && filterText && !exactMatch) {
            const newOptionEl = document.createElement('div');
            newOptionEl.className = 'custom-dropdown-option add-new';
            newOptionEl.innerHTML = `
                <span style="color: #3b82f6; font-weight: 600;">➕ Yeni Ekle: "${filterText}"</span>
            `;

            newOptionEl.addEventListener('click', () => {
                const newOpt = document.createElement('option');
                newOpt.value = filterText;
                newOpt.textContent = filterText;
                selectElement.appendChild(newOpt);
                selectElement.selectedIndex = selectElement.options.length - 1;

                selectOption(selectElement.selectedIndex);
            });

            optionsContainer.appendChild(newOptionEl);
        }
    }

    // Select an option
    function selectOption(index) {
        selectElement.selectedIndex = index;
        const selectedOption = selectElement.options[index];

        // Update trigger text
        const valueSpan = trigger.querySelector('.custom-dropdown-value');
        valueSpan.textContent = selectedOption.textContent;

        // Update visual selection
        optionsContainer.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        const selectedEl = optionsContainer.querySelector(`[data-index="${index}"]`);
        if (selectedEl) {
            selectedEl.classList.add('selected');
        }

        // Trigger change event on original select
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));

        // Close dropdown
        closeDropdown();
    }

    // Open dropdown
    function openDropdown() {
        // Dispatch global event to close all other dropdowns
        document.dispatchEvent(new CustomEvent('close-custom-dropdowns'));

        trigger.classList.add('active');
        menu.classList.add('active');
        if (searchable) {
            const searchInput = menu.querySelector('.custom-dropdown-search input');
            setTimeout(() => searchInput.focus(), 50);
        }
    }

    // Close dropdown
    function closeDropdown() {
        trigger.classList.remove('active');
        menu.classList.remove('active');
        if (searchable) {
            const searchInput = menu.querySelector('.custom-dropdown-search input');
            searchInput.value = '';
            populateOptions();
        }
    }

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.classList.contains('active')) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    // Search functionality
    if (searchable) {
        const searchInput = menu.querySelector('.custom-dropdown-search input');
        searchInput.addEventListener('input', (e) => {
            populateOptions(e.target.value);
        });
        searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            closeDropdown();
        }
    });

    // Close when another dropdown opens
    document.addEventListener('close-custom-dropdowns', () => {
        if (menu.classList.contains('active')) {
            closeDropdown();
        }
    });

    // Initial population
    populateOptions();

    // Set initial value if select has a selected option
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    if (selectedOption && selectedOption.value) {
        trigger.querySelector('.custom-dropdown-value').textContent = selectedOption.textContent;
    }

    const api = {
        refresh: () => {
            populateOptions();
            const selectedOpt = selectElement.options[selectElement.selectedIndex];
            if (selectedOpt) {
                trigger.querySelector('.custom-dropdown-value').textContent = selectedOpt.textContent;
            } else {
                trigger.querySelector('.custom-dropdown-value').textContent = placeholder;
            }
        },
        open: openDropdown,
        close: closeDropdown,
        destroy: () => {
            wrapper.parentNode.insertBefore(selectElement, wrapper);
            wrapper.remove();
            selectElement.style.display = '';
            delete selectElement.customDropdown;
        }
    };

    selectElement.customDropdown = api;

    return api;
}

// Auto-initialize all selects with data-custom-dropdown attribute
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('select[data-custom-dropdown]').forEach(select => {
        createCustomDropdown(select, {
            searchable: select.dataset.searchable !== 'false',
            placeholder: select.dataset.placeholder || 'Seçiniz...',
            allowNew: select.dataset.allowNew === 'true'
        });
    });
});
