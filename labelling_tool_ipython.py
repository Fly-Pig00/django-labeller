import base64

from IPython.html import widgets
from IPython.utils.traitlets import Unicode, Integer, List





class ImageLabellingTool (widgets.DOMWidget):
    _view_name = Unicode('ImageLabellingToolView', sync=True)

    label_classes = List(sync=True)

    tool_width_ = Integer(sync=True)
    tool_height_ = Integer(sync=True)

    image_ids_ = List(sync=True)
    current_image_id_ = Unicode(sync=True)



    def __init__(self, labelled_images=None, label_classes=None, tool_width=1040, tool_height=585, **kwargs):
        """

        :type labelled_images: AbstractLabelledImage
        :param labelled_images: a list of images to label

        :type label_classes: [LabelClass]
        :param label_classes: list of label classes available to the user

        :type tool_width: int
        :param tool_width: width of tool in pixels

        :type tool_height: int
        :param tool_height: height of tool in pixels

        :param kwargs: kwargs passed to DOMWidget constructor
        """
        if label_classes is None:
            label_classes = []

        label_classes = [{'name': cls.name, 'human_name': cls.human_name, 'colour': cls.colour}   for cls in label_classes]

        if labelled_images is None:
            labelled_images = []

        image_ids = [str(i)   for i in xrange(len(labelled_images))]
        self.__images = {image_id: img   for image_id, img in zip(image_ids, labelled_images)}
        self.__changing = False

        super(ImageLabellingTool, self).__init__(tool_width_=tool_width, tool_height_=tool_height,
                                            image_ids_=image_ids,
                                            current_image_id_=image_ids[0],
                                            label_classes=label_classes, **kwargs)

        self.on_msg(self._on_msg_recv)

        self.label_data = labelled_images[0].labels


    def _on_msg_recv(self, _, msg):
        msg_type = msg.get('msg_type', '')
        if msg_type == 'request_image_descriptor':
            try:
                image_id = str(msg.get('image_id', '0'))
            except ValueError:
                image_id = '0'

            image_msg = {}

            image = self.__images[image_id]
            data, mimetype, width, height = image.data_and_mime_type_and_size()

            data_b64 = base64.b64encode(data)

            image_msg['label_header'] = {'image_id': image_id, 'labels': image.labels, 'complete': False}
            self.label_data = image.labels
            image_msg['width'] = width
            image_msg['height'] = height
            image_msg['href'] = 'data:{0};base64,'.format(mimetype) + data_b64
            self.send({
                'msg_type': 'set_image',
                'image': image_msg
            })
        elif msg_type == 'label_header':
            value = msg.get('label_header')
            if value is not None:
                image_id = value['image_id']
                complete = value['complete']
                labels = value['labels']
                self.__images[image_id].labels = labels
                print('Received changes for image {0}; {1} labels'.format(image_id, len(labels)))


