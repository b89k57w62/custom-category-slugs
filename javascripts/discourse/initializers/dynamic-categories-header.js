import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";

export default {
  name: "dynamic-categories-header",
  
  initialize() {
    const self = this;
    withPluginApi("0.8.7", (api) => {
      console.log("Dynamic Categories Header: Initializing");
      
      // 只在首页和最新页显示，避免在分类页重复显示
      api.onPageChange((url, title) => {
        console.log("Dynamic Categories Header: Page changed to", url);
        if (url === "/" || url === "/latest") {
          setTimeout(() => {
            self.insertCategoriesHeader();
          }, 500);
        } else {
          self.removeCategoriesHeader();
        }
      });
      
      // 初始化时检查当前页面
      const currentPath = window.location.pathname;
      console.log("Dynamic Categories Header: Current path", currentPath);
      if (currentPath === "/" || currentPath === "/latest") {
        setTimeout(() => {
          self.insertCategoriesHeader();
        }, 800);
      }
    });
  },
  
  async insertCategoriesHeader() {
    console.log("Dynamic Categories Header: Attempting to insert");
    
    // 检查是否启用
    if (!this.getThemeSetting("enable_header")) {
      console.log("Dynamic Categories Header: Disabled by setting");
      return;
    }
    
    // 移除现有的头部
    const existingHeader = document.querySelector(".dynamic-categories-header");
    if (existingHeader) {
      existingHeader.remove();
      console.log("Dynamic Categories Header: Removed existing header");
    }
    
    const targetElement = this.findInsertionPoint();
    if (!targetElement) {
      console.log("Dynamic Categories Header: No insertion point found");
      return;
    }
    
    console.log("Dynamic Categories Header: Found insertion point", targetElement);
    
    try {
      const categoriesData = await this.fetchCategories();
      if (!categoriesData || categoriesData.length === 0) {
        console.log("Dynamic Categories Header: No categories data");
        return;
      }
      
      console.log("Dynamic Categories Header: Loaded categories", categoriesData.length);
      
      const headerHtml = this.buildCategoriesHeader(categoriesData);
      
      const headerElement = document.createElement("div");
      headerElement.innerHTML = headerHtml;
      headerElement.className = "dynamic-categories-header";
      
      targetElement.insertAdjacentElement("beforebegin", headerElement);
      
      console.log("Dynamic Categories Header: Successfully inserted");
      
    } catch (error) {
      console.error("Dynamic Categories Header: Failed to load categories:", error);
    }
  },
  
  findInsertionPoint() {
    // 首先尝试在广告banner之前插入
    const adBanner = document.querySelector(".google-adsense, .advertisement, [class*='ad-'], [id*='ad-'], .google-dfp-ad-unit");
    if (adBanner) {
      console.log("Dynamic Categories Header: Found ad banner insertion point");
      return adBanner;
    }
    
    // 寻找主题列表相关容器
    const topicListContainer = document.querySelector(".topic-list-container");
    if (topicListContainer) {
      console.log("Dynamic Categories Header: Found topic list container");
      return topicListContainer;
    }
    
    const topicList = document.querySelector(".topic-list");
    if (topicList) {
      console.log("Dynamic Categories Header: Found topic list");
      return topicList;
    }
    
    // 寻找主要内容容器
    const mainContainer = document.querySelector("#main-outlet .container");
    if (mainContainer) {
      console.log("Dynamic Categories Header: Found main container");
      return mainContainer.firstElementChild;
    }
    
    // 最后的备用选项
    const mainOutlet = document.querySelector("#main-outlet");
    if (mainOutlet) {
      console.log("Dynamic Categories Header: Found main outlet");
      return mainOutlet.firstElementChild;
    }
    
    console.log("Dynamic Categories Header: No suitable insertion point found");
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
      console.log("Dynamic Categories Header: Removed header");
    }
  },
  
  getThemeSetting(settingName) {
    try {
      return settings[settingName];
    } catch (e) {
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