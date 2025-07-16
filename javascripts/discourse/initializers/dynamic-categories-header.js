import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";

export default {
  name: "dynamic-categories-header",
  insertTimeout: null,
  isInserting: false,
  
  initialize(container) {
    console.log('[DEBUG] Component initializing...');
    const self = this;
    this.siteSettings = container.lookup("service:site-settings");
    
    withPluginApi("0.8.7", (api) => {
      console.log('[DEBUG] Plugin API ready');
      
      api.onPageChange((url, title) => {
        console.log('[DEBUG] Page change detected:', url);
        if (self.insertTimeout) {
          clearTimeout(self.insertTimeout);
          self.insertTimeout = null;
        }
        
        if (url === "/" || url === "/latest") {
          console.log('[DEBUG] Homepage detected, scheduling insertion');
          self.insertTimeout = setTimeout(() => {
            self.insertCategoriesHeader();
          }, 500);
        } else {
          console.log('[DEBUG] Non-homepage, removing header');
          self.removeCategoriesHeader();
        }
      });
      
      const currentPath = window.location.pathname;
      console.log('[DEBUG] Current path:', currentPath);
      if (currentPath === "/" || currentPath === "/latest") {
        console.log('[DEBUG] Initial homepage load, scheduling insertion');
        self.insertTimeout = setTimeout(() => {
          self.insertCategoriesHeader();
        }, 800);
      }
    });
  },
  
  async insertCategoriesHeader() {
    console.log('[DEBUG] insertCategoriesHeader called');
    
    // 防止重复插入
    if (this.isInserting) {
      console.log('[DEBUG] Already inserting, returning');
      return;
    }
    
    this.isInserting = true;
    
         try {
       const isEnabled = this.getThemeSetting("show_categories_header");
       console.log('[DEBUG] Categories header enabled:', isEnabled);
       if (!isEnabled) {
         console.log('[DEBUG] Categories header disabled, exiting');
         this.isInserting = false;
         return;
       }
       
       this.removeCategoriesHeader();
       this.isInserting = true; 
       
       const targetElement = this.findInsertionPoint();
       console.log('[DEBUG] Target element found:', targetElement ? targetElement.className : 'null');
       if (!targetElement) {
         console.log('[DEBUG] No target element found, exiting');
         this.isInserting = false;
         return;
       }
       
       const categoriesData = await this.fetchCategories();
       console.log('[DEBUG] Categories data:', categoriesData ? categoriesData.length : 'null', 'categories');
       if (!categoriesData || categoriesData.length === 0) {
         console.log('[DEBUG] No categories data, exiting');
         this.isInserting = false;
         return;
       }
      
       const stillExistsById = document.getElementById("dynamic-categories-header-unique");
       const stillExistsByClass = document.querySelector(".dynamic-categories-header");
       if (stillExistsById || stillExistsByClass) {
         this.removeCategoriesHeader();
         this.isInserting = true;
       }
      
      const headerHtml = this.buildCategoriesHeader(categoriesData);
      console.log('[DEBUG] Header HTML built, length:', headerHtml.length);
      
             const headerElement = document.createElement("div");
       headerElement.innerHTML = headerHtml;
       headerElement.className = "dynamic-categories-header";
       headerElement.id = "dynamic-categories-header-unique";
       
       console.log('[DEBUG] Header element created, inserting...');
       if (targetElement && targetElement.parentNode) {
         targetElement.insertAdjacentElement("beforebegin", headerElement);
         console.log('[DEBUG] Header element inserted successfully');
         
         // 验证插入是否成功
         const inserted = document.getElementById("dynamic-categories-header-unique");
         console.log('[DEBUG] Verification - element exists after insertion:', inserted !== null);
       } else {
         console.log('[DEBUG] Cannot insert - no target element or parent');
       }
      
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      this.isInserting = false;
    }
  },
  
  findInsertionPoint() {
    console.log('[DEBUG] Finding insertion point with universal strategy...');
    
    // 使用通用策略：寻找主内容区域，适用于所有用户状态
    
    // 1. 寻找包含实际内容的container，跳过banner
    const containers = document.querySelectorAll("#main-outlet > .container");
    console.log('[DEBUG] Found containers:', containers.length);
    
    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
      console.log(`[DEBUG] Container ${i}:`, container.className);
      
      // 跳过banner和搜索相关的容器
      if (!container.classList.contains('search-banner') && 
          !container.classList.contains('welcome-banner') &&
          !container.className.includes('above-main-container-outlet')) {
        console.log('[DEBUG] Selected main content container:', container.className);
        return container;
      }
    }
    
    // 2. 如果没找到合适的container，寻找第一个非banner元素
    const mainOutlet = document.querySelector("#main-outlet");
    if (mainOutlet) {
      const children = Array.from(mainOutlet.children);
      console.log('[DEBUG] main-outlet children:', children.length);
      
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        console.log(`[DEBUG] Child ${i}:`, child.className);
        
        // 跳过各种banner
        if (!child.classList.contains('above-main-container-outlet') && 
            !child.classList.contains('welcome-banner') &&
            !child.classList.contains('search-banner')) {
          console.log('[DEBUG] Selected first content element:', child.className);
          return child;
        }
      }
    }
    
    console.log('[DEBUG] No suitable insertion point found');
    return null;
  },
  
  async fetchCategories() {
    try {
      const response = await ajax("/categories.json");
      const maxCategories = this.getThemeSetting("max_categories_shown") || 8;
      const showSubcategories = this.getThemeSetting("show_subcategories");
      
      return response.category_list.categories.filter(category => 
        !category.parent_category_id || showSubcategories
      ).slice(0, maxCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      const site = Discourse.Site.current();
      const maxCategories = this.getThemeSetting("max_categories_shown") || 8;
      const showSubcategories = this.getThemeSetting("show_subcategories");
      
      return site.categories.filter(category => 
        !category.parent_category_id || showSubcategories
      ).slice(0, maxCategories);
    }
  },
  
  buildCategoriesHeader(categories) {
    const showTopicCount = this.getThemeSetting("show_topic_count");
    
    let html = `
      <div class="categories-header-wrapper">
        <div class="categories-nav">
    `;
    
    categories.forEach(category => {
      const categoryColor = category.color ? `#${category.color}` : "#0088cc";
      const topicCount = category.topic_count || 0;
      
      html += `
        <a href="/c/${category.slug}/${category.id}" class="category-nav-item" data-category-id="${category.id}" style="--category-color: ${categoryColor};">
          <div class="category-content">
            <span class="category-name">${category.name}</span>
            ${showTopicCount ? `<span class="category-count">${topicCount}</span>` : ""}
          </div>
        </a>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  },
  
  removeCategoriesHeader() {
    const headerById = document.getElementById("dynamic-categories-header-unique");
    if (headerById) {
      headerById.remove();
    }
    
    const existingHeaders = document.querySelectorAll(".dynamic-categories-header");
    existingHeaders.forEach(header => {
      if (header && header.parentNode) {
        header.remove();
      }
    });
    
    this.isInserting = false;
    
    if (this.insertTimeout) {
      clearTimeout(this.insertTimeout);
      this.insertTimeout = null;
    }
  },
  
  getThemeSetting(settingName) {
    try {
      if (typeof settings !== 'undefined' && settings[settingName] !== undefined) {
        return settings[settingName];
      }
      
      if (this.siteSettings && this.siteSettings[settingName] !== undefined) {
        return this.siteSettings[settingName];
      }
      
      const defaults = {
        'show_categories_header': true,
        'max_categories_shown': 8,
        'categories_per_row': 6,
        'show_subcategories': false,
        'show_category_description': false,
        'show_topic_count': false,
        'enable_animations': true,
        'hide_on_category_pages': true
      };
      
      return defaults[settingName] || null;
    } catch (e) {
      if (settingName === 'show_categories_header') return true;
      return null;
    }
  },
  
  lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const B = (num >> 8 & 0x00FF) + amt;
    const G = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
                 (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + 
                 (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
  },
  
  adjustOpacity(color, opacity) {
    if (color.startsWith("#")) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  }
}; 