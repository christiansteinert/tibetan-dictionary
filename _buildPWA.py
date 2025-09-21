#!/usr/bin/env python3
"""
PWA Build Script
Generates cache manifests and validates PWA resources
"""

import os
import json
import hashlib
import re
from pathlib import Path
from datetime import datetime

class PWABuilder:
    def __init__(self, webapp_dir):
        self.webapp_dir = Path(webapp_dir)
        self.cache_version = None
        self.file_hashes = {}
        
    def generate_cache_version(self):
        """Generate cache version based on content hashes"""
        # Get all relevant file hashes
        files_to_hash = self.get_core_resources()
        
        combined_hash = hashlib.md5()
        for file_path in sorted(files_to_hash):
            # Skip root directory paths
            if file_path in ['./', './']:
                continue
                
            full_path = self.webapp_dir / file_path.lstrip('./')
            if full_path.exists() and full_path.is_file():
                with open(full_path, 'rb') as f:
                    file_hash = hashlib.md5(f.read()).hexdigest()
                    self.file_hashes[file_path] = file_hash
                    combined_hash.update(file_hash.encode())
        
        self.cache_version = f"tibetan-dict-v{combined_hash.hexdigest()[:8]}"
        return self.cache_version
    
    def get_core_resources(self):
        """Get list of core resources that should be cached"""
        # Parse index.html to find referenced resources
        index_path = self.webapp_dir / 'index.html'
        if not index_path.exists():
            raise FileNotFoundError("index.html not found")
        
        resources = set()
        
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find CSS files
        css_pattern = r'href=["\']([^"\']+\.css)["\']'
        css_files = re.findall(css_pattern, content)
        resources.update(css_files)
        
        # Find JS files
        js_pattern = r'src=["\']([^"\']+\.js)["\']'
        js_files = re.findall(js_pattern, content)
        resources.update(js_files)
        
        # Find images referenced in HTML
        img_pattern = r'src=["\']([^"\']+\.(png|jpg|jpeg|gif|svg|webp))["\']'
        img_files = [match[0] for match in re.findall(img_pattern, content)]
        resources.update(img_files)
        
        # Add manifest and root files
        resources.add('./manifest.json')
        resources.add('./index.html')
        resources.add('./')
        
        # Add icon files
        icon_extensions = ['.png', '.jpg', '.jpeg', '.ico', '.svg']
        icons_dir = self.webapp_dir / 'icons'
        if icons_dir.exists():
            for icon_file in icons_dir.iterdir():
                if icon_file.suffix.lower() in icon_extensions:
                    resources.add(f'./icons/{icon_file.name}')
        
        # Add fonts
        font_extensions = ['.woff', '.woff2', '.ttf', '.eot']
        css_dir = self.webapp_dir / 'code' / 'css'
        if css_dir.exists():
            for font_file in css_dir.iterdir():
                if font_file.suffix.lower() in font_extensions:
                    resources.add(f'./code/css/{font_file.name}')
        
        # Add DataTables core images (only the essential ones)
        dt_images_dir = self.webapp_dir / 'lib' / 'datatables' / 'media' / 'images'
        if dt_images_dir.exists():
            essential_dt_images = [
                'sort_asc.png', 'sort_desc.png', 'sort_both.png',
                'sort_asc_disabled.png', 'sort_desc_disabled.png'
            ]
            for img_name in essential_dt_images:
                img_path = dt_images_dir / img_name
                if img_path.exists():
                    resources.add(f'./lib/datatables/media/images/{img_name}')
        
        # Filter out excluded paths
        filtered_resources = set()
        excluded_patterns = [
            '/data/scan/', '/scanned/data/', '.db', '.directory',
            '/examples/', '/spec/', '/test/', '/tests/'
        ]
        
        for resource in resources:
            should_exclude = any(pattern in resource for pattern in excluded_patterns)
            if not should_exclude:
                # Normalize path
                if not resource.startswith('./'):
                    resource = './' + resource.lstrip('/')
                filtered_resources.add(resource)
        
        return sorted(list(filtered_resources))
    
    def update_cache_manager(self):
        """Update cache manager with generated resource list and version"""
        cache_manager_path = self.webapp_dir / 'code' / 'js' / 'pwa' / 'cache-manager.js'
        
        if not cache_manager_path.exists():
            raise FileNotFoundError("cache-manager.js not found")
        
        resources = self.get_core_resources()
        
        # Read current file
        with open(cache_manager_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Update cache name
        cache_name_pattern = r"this\.CACHE_NAME = '[^']+'"
        new_cache_name = f"this.CACHE_NAME = '{self.cache_version}'"
        content = re.sub(cache_name_pattern, new_cache_name, content)
        
        # Update core resources array
        resources_js = json.dumps(resources, indent='      ')
        resources_pattern = r'this\.coreResources = \[[^\]]*\];'
        new_resources = f'this.coreResources = {resources_js};'
        content = re.sub(resources_pattern, new_resources, content, flags=re.DOTALL)
        
        # Write updated file
        with open(cache_manager_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Updated cache manager with {len(resources)} resources")
        return resources
    
    def validate_resources(self):
        """Validate that all referenced resources exist"""
        resources = self.get_core_resources()
        missing = []
        
        for resource in resources:
            # Skip root path
            if resource in ['./', './']:
                continue
                
            resource_path = self.webapp_dir / resource.lstrip('./')
            if not resource_path.exists():
                missing.append(resource)
        
        if missing:
            print(f"Warning: {len(missing)} resources are missing:")
            for resource in missing:
                print(f"  - {resource}")
        else:
            print("All resources validated successfully")
        
        return len(missing) == 0
    
    def generate_build_info(self):
        """Generate build information file"""
        build_info = {
            'cache_version': self.cache_version,
            'build_time': datetime.now().isoformat(),
            'resources_count': len(self.get_core_resources()),
            'file_hashes': self.file_hashes
        }
        
        build_info_path = self.webapp_dir / 'build-info.json'
        with open(build_info_path, 'w', encoding='utf-8') as f:
            json.dump(build_info, f, indent=2)
        
        print(f"Generated build info: {build_info_path}")
        return build_info
    
    def build(self):
        """Run complete PWA build process"""
        print("=== PWA Build Process ===")
        print(f"Working directory: {self.webapp_dir}")
        
        # Generate cache version
        cache_version = self.generate_cache_version()
        print(f"Generated cache version: {cache_version}")
        
        # Update cache manager
        resources = self.update_cache_manager()
        print(f"Updated cache manager with {len(resources)} resources")
        
        # Validate resources
        is_valid = self.validate_resources()
        
        # Generate build info
        build_info = self.generate_build_info()
        
        if is_valid:
            print("=== Build completed successfully ===")
        else:
            print("=== Build completed with warnings ===")
        
        return build_info

def main():
    import sys
    
    # Get webapp directory from command line or use default
    if len(sys.argv) > 1:
        webapp_dir = sys.argv[1]
    else:
        # Assume script is run from repository root
        webapp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'webapp')
    
    if not os.path.exists(webapp_dir):
        print(f"Error: webapp directory not found: {webapp_dir}")
        sys.exit(1)
    
    try:
        builder = PWABuilder(webapp_dir)
        builder.build()
    except Exception as e:
        print(f"Build failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()