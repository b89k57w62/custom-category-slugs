import { withPluginApi } from "discourse/lib/plugin-api";
import { ajax } from "discourse/lib/ajax";

export default {
  name: "dynamic-categories-header",
  
  initialize() {
    const self = this;
    withPluginApi("0.8.7", (api) => {
      const siteSettings = api.container.lookup("site-settings:main");
      const site = api.container.lookup("site:main");
      
      api.onPageChange((url, title) => {
        if (url === "/" || url === "/latest" || url === "/categories") {
          self.insertCategoriesHeader();
        } else {
          self.removeCategoriesHeader();
        }
      });
      
      api.onAppEvent("page:changed", () => {
        const currentPath = window.location.pathname;
        if (currentPath === "/" || currentPath === "/latest" || currentPath === "/categories") {
          setTimeout(() => {
            self.insertCategoriesHeader();
          }, 100);
        }
      });
    });
  },
  
  async insertCategoriesHeader() {
    if (document.querySelector(".dynamic-categories-header")) {
      return;
    }
    
    const targetElement = this.findInsertionPoint();
    if (!targetElement) {
      return;
    }
    
    try {
      const categoriesData = await this.fetchCategories();
      const headerHtml = this.buildCategoriesHeader(categoriesData);
      
      const headerElement = document.createElement("div");
      headerElement.innerHTML = headerHtml;
      headerElement.className = "dynamic-categories-header";
      
      targetElement.insertAdjacentElement("afterend", headerElement);
      
      this.attachClickListeners(headerElement);
      
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  },
  
  findInsertionPoint() {
    const searchHeader = document.querySelector("#search-button") || 
                        document.querySelector(".search-header") ||
                        document.querySelector("#main-outlet-wrapper > .container > .row");
    
    const adBanner = document.querySelector(".google-adsense, .advertisement, [class*='ad-'], [id*='ad-']");
    if (adBanner) {
      return adBanner.previousElementSibling || adBanner.parentElement;
    }
    
    return document.querySelector("#main-outlet-wrapper .container") || 
           document.querySelector("#main-outlet") ||
           document.querySelector(".container.view-categories");
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
    const categoriesPerRow = this.getThemeSetting("categories_per_row") || 4;
    const showDescription = this.getThemeSetting("show_category_description");
    const showTopicCount = this.getThemeSetting("show_topic_count");
    const customTitle = this.getThemeSetting("custom_header_title") || "分類";
    
    let html = `
      <div class="categories-header-wrapper">
        <div class="categories-header-title">
          <h3>${customTitle}</h3>
        </div>
        <div class="categories-grid" style="display: grid; grid-template-columns: repeat(${categoriesPerRow}, 1fr); gap: 15px; margin: 20px 0;">
    `;
    
    categories.forEach(category => {
      const categoryColor = category.color ? `#${category.color}` : "#0088cc";
      const textColor = category.text_color ? `#${category.text_color}` : "#ffffff";
      const topicCount = category.topic_count || 0;
      const description = showDescription && category.description_excerpt 
        ? category.description_excerpt 
        : "";
      
      html += `
        <div class="category-card" data-category-id="${category.id}" style="
          background: linear-gradient(135deg, ${categoryColor}, ${this.lightenColor(categoryColor, 20)});
          border-radius: 8px;
          padding: 15px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        ">
          <div class="category-header">
            <div class="category-name" style="
              color: ${textColor};
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 8px;
            ">${category.name}</div>
            ${description ? `
              <div class="category-description" style="
                color: ${this.adjustOpacity(textColor, 0.9)};
                font-size: 13px;
                line-height: 1.4;
                margin-bottom: 10px;
              ">${description}</div>
            ` : ""}
          </div>
          ${showTopicCount ? `
            <div class="category-stats" style="
              color: ${this.adjustOpacity(textColor, 0.8)};
              font-size: 12px;
              display: flex;
              align-items: center;
              gap: 5px;
            ">
              <i class="fa fa-comments" style="opacity: 0.7;"></i>
              ${topicCount} 個討論
            </div>
          ` : ""}
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  },
  
  attachClickListeners(headerElement) {
    const categoryCards = headerElement.querySelectorAll(".category-card");
    categoryCards.forEach(card => {
      card.addEventListener("click", (e) => {
        const categoryId = card.dataset.categoryId;
        const site = Discourse.Site.current();
        const category = site.categories.findBy("id", parseInt(categoryId));
        
        if (category) {
          window.location.href = `/c/${category.slug}/${category.id}`;
        }
      });
      
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-2px)";
        card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
      });
      
      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)";
        card.style.boxShadow = "none";
      });
    });
  },
  
  removeCategoriesHeader() {
    const existingHeader = document.querySelector(".dynamic-categories-header");
    if (existingHeader) {
      existingHeader.remove();
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