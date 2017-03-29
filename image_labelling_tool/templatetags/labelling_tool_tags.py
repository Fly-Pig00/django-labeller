import uuid, json

from django import template
from django.utils.html import format_html

from image_labelling_tool import labelling_tool as lt

register = template.Library()


@register.simple_tag
def labelling_tool_scripts():
    script_urls = lt.js_file_urls('/static/labelling_tool/')
    script_tags = ''.join(['<script src="{}"></script>\n'.format(url) for url in script_urls])
    return format_html(script_tags)

@register.inclusion_tag('inline/labelling_tool.html')
def labelling_tool(width, height, label_classes, image_descriptors, initial_image_index,
                   get_labels_url, update_labels_url, config=None):
    tool_id = uuid.uuid4()
    if config is None:
        config = {}
    return {'tool_id': str(tool_id),
            'width': width,
            'height': height,
            'label_classes': json.dumps(label_classes),
            'image_descriptors': json.dumps(image_descriptors),
            'initial_image_index': str(initial_image_index),
            'get_labels_url': get_labels_url,
            'update_labels_url': update_labels_url,
            'config': json.dumps(config),
            }
