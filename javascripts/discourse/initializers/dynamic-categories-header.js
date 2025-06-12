import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";

export default {
  name: "dynamic-categories-header",
  
  initialize(container) {
    const self = this;
    this.siteSettings = container.lookup("service:site-settings");
    
    withPluginApi("0.8.7", (api) => {
      
      api.onPageChange((url, title) => {
        if (url === "/" || url === "/latest") {
          setTimeout(() => {
            self.insertCategoriesHeader();
          }, 500);
        } else {
          self.removeCategoriesHeader();
        }
      });
      
      const currentPath = window.location.pathname;
      if (currentPath === "/" || currentPath === "/latest") {
        setTimeout(() => {
          self.insertCategoriesHeader();
        }, 800);
      }
    });
  },
  
  async insertCategoriesHeader() {
    
    const isEnabled = this.getThemeSetting("show_categories_header");
    if (!isEnabled) {
      return;
    }
    
    const existingHeader = document.querySelector(".dynamic-categories-header");
    if (existingHeader) {
      existingHeader.remove();
    }
    
    const targetElement = this.findInsertionPoint();
    if (!targetElement) {
      return;
    }
    
    
    try {
      const categoriesData = await this.fetchCategories();
      if (!categoriesData || categoriesData.length === 0) {
        return;
      }
      
      
      const headerHtml = this.buildCategoriesHeader(categoriesData);
      
      const headerElement = document.createElement("div");
      headerElement.innerHTML = headerHtml;
      headerElement.className = "dynamic-categories-header";
      
      targetElement.insertAdjacentElement("beforebegin", headerElement);
      
      
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  },
  
  findInsertionPoint() {
    const adBanner = document.querySelector(".google-adsense, .advertisement, [class*='ad-'], [id*='ad-'], .google-dfp-ad-unit");
    if (adBanner) {
      return adBanner;
    }
    
    const topicListContainer = document.querySelector(".topic-list-container");
    if (topicListContainer) {
      return topicListContainer;
    }
    
    const topicList = document.querySelector(".topic-list");
    if (topicList) {
      return topicList;
    }
    
    const mainContainer = document.querySelector("#main-outlet .container");
    if (mainContainer) {
      return mainContainer.firstElementChild;
    }
    
    const mainOutlet = document.querySelector("#main-outlet");
    if (mainOutlet) {
      return mainOutlet.firstElementChild;
    }
    
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
    const existingHeader = document.querySelector(".dynamic-categories-header");
    if (existingHeader) {
      existingHeader.remove();
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